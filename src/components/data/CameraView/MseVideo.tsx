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

/** Above this much buffered-ahead, jump to the live edge. MSE will happily play a growing backlog
 *  in real time forever, which on a teleoperation feed is worse than a visible skip. */
const LIVE_EDGE_MAX_S = 0.3;
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
			let lastPosition = -1;
			let lastProgressAt = Date.now();
			let started = false;
			let finished = false;

			const cleanup = () => {
				if (stallTimer !== null) {
					window.clearInterval(stallTimer);
					stallTimer = null;
				}
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

			function seekToLive() {
				const el = videoRef.current;
				if (!el || !sourceBuffer || sourceBuffer.buffered.length === 0) return;
				const end = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
				if (end - el.currentTime > LIVE_EDGE_MAX_S) {
					el.currentTime = Math.max(0, end - 0.05);
				}
			}

			function onVisible() {
				// A backgrounded tab keeps buffering but stops rendering, so it returns holding a
				// backlog. Snap forward rather than replaying it.
				if (!document.hidden) seekToLive();
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
					seekToLive();
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
