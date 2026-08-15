import { useEffect, useRef, useState } from "react";
import DefaultImage from "../../../assets/images/NoCam.png";

/*
Description: Plays a camera that is streamed as fragmented MP4 instead of MJPEG.

The backend hands us the rover's H.264 untouched — nothing decodes or re-encodes it server side —
so this is the only place the stream is decoded, by the browser itself. That is what keeps the
gripper's latency close to a bare `gst-launch ... ! autovideosink` and takes jpegenc off the CS.

The cost of feeding a browser decoder directly is that it is far less forgiving than avdec_h264 was:
a corrupt fragment can kill playback outright, and MSE has several ways to stall while still looking
healthy from the outside. Every one of those is a reconnect trigger below.
*/

/**
 * How far behind the live edge the playhead is held, in seconds.
 *
 * MSE will happily play a growing backlog in real time forever, so something has to pull the
 * playhead forward. What that something must NOT be is a threshold that only acts once the lag is
 * already unacceptable: whatever backlog the browser accumulates while it starts up then becomes
 * the permanent latency, because it sits just under the threshold and nothing ever trims it.
 * Measured on a loopback replica of the rover's encoder, a 0.3 s trigger settled at 175-285 ms of
 * standing delay across runs; holding 0.15 s continuously settles at ~85 ms.
 */
const LIVE_EDGE_TARGET_S = 0.15;
/** Past this, playback is so far behind that catching up at 1.15x would take longer than the skip
 *  is worth — a backgrounded tab, or a long stall. Only here is a visible jump the right answer. */
const LIVE_EDGE_HARD_S = 0.75;
/** Slow enough to be invisible on a muted video, fast enough to absorb a 0.3 s excursion in ~2 s. */
const CATCH_UP_RATE = 1.15;
/** The controller cannot run on `updateend` alone: appends stop while the rover is between
 *  keyframes or the link hiccups, which is exactly when the playhead falls behind. */
const LIVE_EDGE_TICK_MS = 250;
/** Buffered history to keep behind the playhead. Bounds SourceBuffer memory on a stream that never
 *  ends. */
const BUFFER_KEEP_S = 5;
/** Playback position not advancing for this long is a stall, whatever the element claims. */
const STALL_TIMEOUT_MS = 2000;
const RECONNECT_MIN_MS = 500;
const RECONNECT_MAX_MS = 5000;

const MseVideo = ({
	src,
	className,
	rotation = 0,
	onDoubleClick,
	registerEl,
}: {
	src: string;
	className: string;
	rotation?: number;
	onDoubleClick?: () => void;
	registerEl?: (el: HTMLVideoElement | null) => void;
}) => {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [unsupported, setUnsupported] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined" || typeof window.MediaSource === "undefined") {
			setUnsupported(true);
			return;
		}

		let cancelled = false;
		let failures = 0;
		let retryTimer: number | null = null;
		let teardown: (() => void) | null = null;

		const scheduleRetry = () => {
			if (cancelled || retryTimer !== null) return;
			const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_MIN_MS * 2 ** Math.min(failures, 4));
			failures += 1;
			retryTimer = window.setTimeout(() => {
				retryTimer = null;
				void connect();
			}, delay);
		};

		const connect = async () => {
			if (cancelled) return;
			const video = videoRef.current;
			if (!video) return;

			const controller = new AbortController();
			const queue: Uint8Array[] = [];
			let mediaSource: MediaSource | null = null;
			let sourceBuffer: SourceBuffer | null = null;
			let objectUrl: string | null = null;
			let stallTimer: number | null = null;
			let edgeTimer: number | null = null;
			let lastPosition = -1;
			let lastProgressAt = Date.now();
			let started = false;
			let finished = false;

			const cleanup = () => {
				if (stallTimer !== null) {
					window.clearInterval(stallTimer);
					stallTimer = null;
				}
				if (edgeTimer !== null) {
					window.clearInterval(edgeTimer);
					edgeTimer = null;
				}
				// playbackRate persists on the element, so a session torn down mid-catch-up would
				// hand the next one a 1.15x video with nothing left to reset it.
				video.playbackRate = 1;
				document.removeEventListener("visibilitychange", onVisible);
				video.removeEventListener("error", onVideoError);
				try {
					controller.abort();
				} catch {
					/* already aborted */
				}
				if (objectUrl) {
					URL.revokeObjectURL(objectUrl);
					objectUrl = null;
				}
				video.removeAttribute("src");
				try {
					video.load();
				} catch {
					/* detaching a never-loaded element */
				}
			};

			/** Single path out of a broken session: tear everything down and reconnect from scratch.
			 *  Rebuilding costs one init segment plus one keyframe, so it is cheap enough to be the
			 *  answer to every failure rather than trying to repair state in place. */
			const fail = () => {
				if (finished) return;
				finished = true;
				cleanup();
				scheduleRetry();
			};

			// Set before any await: unmounting mid-connect must be able to tear this session down.
			teardown = () => {
				finished = true;
				cleanup();
			};

			function onVideoError() {
				fail();
			}

			/**
			 * Holds the playhead near the live edge. Small excesses are absorbed by playing slightly
			 * fast, which is imperceptible; only a gross desync is worth a seek. Seeking for the
			 * small ones is not merely uglier — issuing them at frame rate makes MSE stop advancing
			 * altogether, and the lag then grows without bound.
			 */
			function holdLiveEdge() {
				const el = videoRef.current;
				if (!el || !sourceBuffer || sourceBuffer.buffered.length === 0) return;
				const end = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
				const lag = end - el.currentTime;
				if (lag > LIVE_EDGE_HARD_S) {
					el.currentTime = Math.max(0, end - LIVE_EDGE_TARGET_S);
					el.playbackRate = 1;
				} else if (lag > LIVE_EDGE_TARGET_S) {
					if (el.playbackRate !== CATCH_UP_RATE) el.playbackRate = CATCH_UP_RATE;
				} else if (el.playbackRate !== 1) {
					el.playbackRate = 1;
				}
			}

			function onVisible() {
				// A backgrounded tab keeps buffering but stops rendering, so it returns holding a
				// backlog. Snap forward rather than replaying it.
				if (!document.hidden) holdLiveEdge();
			}

			const pump = () => {
				if (finished || !sourceBuffer || !mediaSource) return;
				if (mediaSource.readyState !== "open" || sourceBuffer.updating) return;
				const chunk = queue.shift();
				if (!chunk) return;
				try {
					sourceBuffer.appendBuffer(chunk);
					started = true;
				} catch (err) {
					if ((err as DOMException)?.name === "QuotaExceededError") {
						// Make room and retry this chunk once; if it still will not fit, rebuild.
						queue.unshift(chunk);
						try {
							sourceBuffer.remove(0, Math.max(0, video.currentTime - 1));
						} catch {
							fail();
						}
					} else {
						fail();
					}
				}
			};

			try {
				const response = await fetch(src, { signal: controller.signal, cache: "no-store" });
				if (cancelled) {
					controller.abort();
					return;
				}
				if (!response.ok || !response.body) {
					fail();
					return;
				}
				const codec = response.headers.get("X-Video-Codec") || "avc1.42E01E";
				const mime = `video/mp4; codecs="${codec}"`;
				if (!MediaSource.isTypeSupported(mime)) {
					// A profile the browser cannot decode is not a transient failure — retrying
					// forever would just spin. Surface it instead; the operator can switch this
					// camera to the ROS source.
					console.error(`[camera] ${src}: browser cannot decode ${mime}`);
					setUnsupported(true);
					cleanup();
					return;
				}

				mediaSource = new MediaSource();
				objectUrl = URL.createObjectURL(mediaSource);
				video.src = objectUrl;
				video.addEventListener("error", onVideoError);
				document.addEventListener("visibilitychange", onVisible);

				await new Promise<void>((resolve) => {
					mediaSource!.addEventListener("sourceopen", () => resolve(), { once: true });
				});
				if (cancelled || finished) return;

				sourceBuffer = mediaSource.addSourceBuffer(mime);
				// 'sequence' lays fragments back to back and ignores their timestamps. Without it a
				// gap in the rover's stream (link drop, camera restart) leaves a hole in the
				// timeline that playback stops at and never crosses.
				sourceBuffer.mode = "sequence";
				sourceBuffer.addEventListener("updateend", () => {
					if (finished) return;
					holdLiveEdge();
					if (
						sourceBuffer &&
						!sourceBuffer.updating &&
						sourceBuffer.buffered.length > 0 &&
						video.currentTime - sourceBuffer.buffered.start(0) > BUFFER_KEEP_S * 2
					) {
						try {
							sourceBuffer.remove(0, video.currentTime - BUFFER_KEEP_S);
						} catch {
							/* a concurrent update; the next updateend retries */
						}
					}
					pump();
				});
				sourceBuffer.addEventListener("error", fail);
				mediaSource.addEventListener("sourceclose", fail);
				mediaSource.addEventListener("sourceended", fail);

				void video.play().catch(() => {
					/* autoplay policy; muted + playsInline should prevent this */
				});

				edgeTimer = window.setInterval(() => {
					if (!finished) holdLiveEdge();
				}, LIVE_EDGE_TICK_MS);

				// Only armed once data is actually flowing: before that the backend may legitimately
				// take a few seconds to produce an init segment, and failing here would loop.
				stallTimer = window.setInterval(() => {
					if (finished || !started) return;
					if (video.currentTime !== lastPosition) {
						lastPosition = video.currentTime;
						lastProgressAt = Date.now();
						return;
					}
					if (Date.now() - lastProgressAt > STALL_TIMEOUT_MS) fail();
				}, 500);

				const reader = response.body.getReader();
				for (;;) {
					const { done, value } = await reader.read();
					if (cancelled || finished) return;
					if (done) {
						// The server closed the stream: gst died, or the backend restarted.
						fail();
						return;
					}
					if (value) {
						failures = 0; // data is flowing; the next failure starts from the short delay
						queue.push(value);
						pump();
					}
				}
			} catch (err) {
				if (cancelled || (err as DOMException)?.name === "AbortError") return;
				fail();
			}
		};

		void connect();

		return () => {
			cancelled = true;
			if (retryTimer !== null) window.clearTimeout(retryTimer);
			teardown?.();
		};
	}, [src]);

	if (unsupported) {
		return (
			<img
				src={DefaultImage}
				alt="Camera unavailable"
				className={className}
				style={{ transform: `rotate(${rotation}deg)` }}
				onDoubleClick={onDoubleClick}
			/>
		);
	}

	return (
		<video
			ref={(el) => {
				videoRef.current = el;
				registerEl?.(el);
			}}
			className={className}
			style={{ transform: `rotate(${rotation}deg)`, background: "black" }}
			onDoubleClick={onDoubleClick}
			autoPlay
			muted
			playsInline
		/>
	);
};

export default MseVideo;
