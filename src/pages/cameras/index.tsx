import styles from "./styles.module.sass";
import CameraView from "../../components/data/CameraView";
import Background from "../../components/ui/Background";
import useCamera from "../../hooks/cameraHooks";
import useAlert from "../../hooks/alertHooks";
import useRosBridge from "../../hooks/rosbridgeHooks";
import useNavCameraBandwidth from "../../hooks/useNavCameraBandwidth";
import useRoverCameraBandwidth from "../../hooks/useRoverCameraBandwidth";
import { Topics } from "../../data/topics.type";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ROSLIB from "roslib";
import rightSteerAlignOverlay from "../../assets/images/maintenance_align/right_steer.png";
import leftSteerAlignOverlay from "../../assets/images/maintenance_align/left_steer.png";

const CAMERA_DEFS = [
	{ id: "nav_front", name: "Front", topic: Topics.NAV_FRONT_CAMERA_COMPRESSED, gstPort: 5006 },
	{ id: "hd_gripper", name: "Gripper Cam", topic: "/ROVER/feed_camera_hd_0", gstPort: 5013 },
	{ id: "cs_top", name: "CS Top", topic: "/ROVER/feed_camera_cs_top", gstPort: 5008 },
	{ id: "cs_right_steer", name: "Right Steer", topic: "/ROVER/feed_camera_cs_right_steer", gstPort: 5010 },
	{ id: "cs_left_steer", name: "Left Steer", topic: "/ROVER/feed_camera_cs_left_steer", gstPort: 5012 },
	{ id: "nav_back", name: "Back", topic: "/CS/feed_camera_nav_0", gstPort: 5000 },
	{ id: "nav_left", name: "Top Left from behind", topic: "/CS/feed_camera_nav_1", gstPort: 5002 },
	{ id: "nav_right", name: "Top Right from behind", topic: "/CS/feed_camera_nav_2", gstPort: 5004 },
	{ id: "drill_inside", name: "Drill Inside", topic: "/ROVER/feed_camera_cs_drill_inside", gstPort: 5016 },
	{ id: "microscope", name: "Microscope", topic: "/microscope/image/compressed", gstPort: 5014 },
] as const;

type CameraDef = (typeof CAMERA_DEFS)[number];
type CameraId = CameraDef["id"];
type CameraSource = "gst" | "ros";
type CameraSourceMap = Record<CameraId, CameraSource>;
type CameraStreamStats = {
	port: number;
	mbps: number;
	packetsPerSec: number;
	payloadMbps: number;
	overheadMbps: number;
	active: boolean;
	lastPacketAgeMs: number | null;
	transport?: "mjpeg" | "fmp4";
	/** Packets the kernel discarded because the receive buffer was full. Anything above 0 means the
	 *  feed is being corrupted upstream of everything this UI can otherwise see. */
	drops?: number | null;
};

/**
 * Cameras streamed as fragmented MP4 rather than MJPEG.
 *
 * These bypass the backend's UDP proxy (gst binds the rover's port directly, so no JS callback runs
 * per RTP packet) and are not transcoded — the browser decodes the rover's H.264 itself. That costs
 * one <video>/MSE player here but removes a decode and a JPEG re-encode per frame on the CS.
 *
 * Mirrored in frontend/ssh_backend/ssh_server.js (CAMERA_TRANSPORTS) — keep in sync.
 */
const FMP4_CAMERAS = new Set<string>(["hd_gripper"]);

const CAMERA_SOURCE_STORAGE_KEY = "erc-cs-camera-feed-sources-v1";

const DEFAULT_CAMERA_SOURCES = CAMERA_DEFS.reduce((acc, camera) => {
	acc[camera.id] = "gst";
	return acc;
}, {} as CameraSourceMap);

const TASK_PRESETS = [
	{ label: "Navigation", cameraIds: ["nav_right", "nav_left", "nav_back", "nav_front"] },
	{ label: "Manipulation", cameraIds: ["hd_gripper", "nav_front", "cs_top", "cs_right_steer", "cs_left_steer"] },
	{ label: "Exploration", cameraIds: ["cs_left_steer","nav_front", "cs_top", "cs_right_steer", "manipulation", "nav_right", "nav_back", "nav_left"] },
	{ label: "Astro-Bio", cameraIds: ["cs_top", "nav_front", "hd_gripper", "nav_right", "nav_back", "nav_left"] },
	{ label: "Probing", cameraIds: ["hd_gripper", "nav_front", "cs_top", "cs_right_steer"] },
	{ label: "Probing NAV", cameraIds: ["nav_front", "hd_gripper", "cs_top", "nav_back"] },
	{ label: "Probing HDS", cameraIds: ["nav_front", "hd_gripper", "cs_right_steer", "cs_left_steer"] },
	{ label: "Sampling", cameraIds: ["hd_gripper", "cs_top", "cs_right_steer", "cs_left_steer", "drill_inside", "§nav_front"], },
] as const;

const getDefaultRotationByCameraId = (cameraId: string): number => {
	if (cameraId === "hd_gripper" || cameraId === "cs_right_steer" || cameraId === "cs_left_steer") {
		return 180;
	}

	return 0;
};

/** Wireframes the operator lines the steer cams up against during maintenance. */
const MAINTENANCE_ALIGN_OVERLAYS: Partial<Record<CameraId, string>> = {
	cs_right_steer: rightSteerAlignOverlay,
	cs_left_steer: leftSteerAlignOverlay,
};

const getDefaultRotations = (cameraIds: readonly string[]): number[] =>
	cameraIds.map((cameraId) => getDefaultRotationByCameraId(cameraId));

function loadCameraSources(): CameraSourceMap {
	if (typeof window === "undefined") return { ...DEFAULT_CAMERA_SOURCES };
	try {
		const raw = window.localStorage.getItem(CAMERA_SOURCE_STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : {};
		return CAMERA_DEFS.reduce((acc, camera) => {
			acc[camera.id] = parsed?.[camera.id] === "ros" ? "ros" : "gst";
			return acc;
		}, {} as CameraSourceMap);
	} catch {
		return { ...DEFAULT_CAMERA_SOURCES };
	}
}

/** Mirrored in frontend/ssh_backend/ssh_server.js — keep in sync. */
const CAMERA_HTTP_PORT_OFFSET = 20000;

/**
 * Each camera streams from its own port, hence its own origin. Browsers allow only 6 concurrent
 * connections per origin; the 8 permanent MJPEG streams plus the stats, link-ping and wifi-signal
 * polls would otherwise fight over that budget and the surplus streams would never start.
 */
function getCameraStreamUrl(camera: CameraDef): string {
	const ext = FMP4_CAMERAS.has(camera.id) ? "mp4" : "mjpg";
	return `${getCameraBackendBaseUrl(camera.gstPort + CAMERA_HTTP_PORT_OFFSET)}/camera-streams/${camera.id}.${ext}`;
}

function getCameraBackendBaseUrl(port: number = 5000): string {
	if (typeof window === "undefined") return "";
	const protocol = window.location.protocol || "http:";
	const hostname = window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname;
	return `${protocol}//${hostname}:${port}`;
}

/**
 * Long edge a saved screenshot is capped at. Cameras run at wildly different resolutions (the
 * microscope in particular); without a cap one 4K frame becomes a multi-MB base64 body — the
 * backend rejects anything over 25 MB, and encoding several huge frames at once janks the page.
 * Frames already smaller than this are only re-encoded, not upscaled.
 */
const SCREENSHOT_MAX_EDGE = 2560;
const SCREENSHOT_JPEG_QUALITY = 0.9;
/** A passthrough (ROS) frame is left untouched below this size — the original compressed frame is
 *  both smaller and higher quality than a re-encode. Above it we downscale like any other. */
const SCREENSHOT_REENCODE_BYTES = 3 * 1024 * 1024;

/** Encode a canvas to a JPEG data URL off the main thread. Resolves null on any failure (including
 *  a tainted canvas, which throws here rather than at draw time). */
function canvasToJpegDataUrl(canvas: HTMLCanvasElement): Promise<string | null> {
	return new Promise((resolve) => {
		try {
			canvas.toBlob(
				(blob) => {
					if (!blob) return resolve(null);
					const reader = new FileReader();
					reader.onload = () =>
						resolve(typeof reader.result === "string" ? reader.result : null);
					reader.onerror = () => resolve(null);
					reader.readAsDataURL(blob);
				},
				"image/jpeg",
				SCREENSHOT_JPEG_QUALITY,
			);
		} catch {
			resolve(null);
		}
	});
}

/** Draw a decoded frame into a canvas no larger than SCREENSHOT_MAX_EDGE on its long side and return
 *  a bounded JPEG data URL. Null if the source has no dimensions or the canvas ends up tainted. */
function frameToBoundedJpeg(
	source: CanvasImageSource,
	srcWidth: number,
	srcHeight: number,
): Promise<string | null> {
	if (!srcWidth || !srcHeight) return Promise.resolve(null);
	const scale = Math.min(1, SCREENSHOT_MAX_EDGE / Math.max(srcWidth, srcHeight));
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(srcWidth * scale));
	canvas.height = Math.max(1, Math.round(srcHeight * scale));
	const ctx = canvas.getContext("2d");
	if (!ctx) return Promise.resolve(null);
	try {
		ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
	} catch {
		return Promise.resolve(null);
	}
	return canvasToJpegDataUrl(canvas);
}

/** Decode a URL (stream or data URL) into an <img>. `cors` must be true for a cross-origin stream
 *  so the frame can be drawn to a canvas without tainting it. */
function decodeImage(src: string, cors: boolean): Promise<HTMLImageElement | null> {
	return new Promise((resolve) => {
		const img = new Image();
		const timer = setTimeout(() => {
			img.src = "";
			resolve(null);
		}, 3000);
		if (cors) img.crossOrigin = "anonymous";
		img.onload = () => {
			clearTimeout(timer);
			resolve(img);
		};
		img.onerror = () => {
			clearTimeout(timer);
			resolve(null);
		};
		img.src = src;
	});
}

/** Top Left (nav_right) on the left, Top Right (nav_left) on the right when only that pair is visible. */
function normalizeFrontStereoOrder(ids: readonly string[]): string[] {
	const arr = [...ids];
	if (arr.length !== 2) return arr;
	const s = new Set(arr);
	if (s.has("nav_left") && s.has("nav_right")) {
		return ["nav_right", "nav_left"];
	}
	return arr;
}

function isNavigationPanoramaPreset(preset: (typeof TASK_PRESETS)[number]): boolean {
	return (
		preset.label === "Navigation" &&
		preset.cameraIds.length === 4 &&
		preset.cameraIds[0] === "nav_right" &&
		preset.cameraIds[1] === "nav_left" &&
		preset.cameraIds[2] === "nav_back" &&
		preset.cameraIds[3] === "nav_front"
	);
}

const BitrateSlider = memo(({
	label,
	defaultValue,
	min,
	max,
	onChange,
}: {
	label: string;
	defaultValue: number;
	min: number;
	max: number;
	onChange: (v: number) => void;
}) => {
	const displayRef = useRef<HTMLDivElement>(null);
	return (
		<>
			<div className={styles.hubSectionTitle}>{label}</div>
			<div ref={displayRef} className={styles.bitrateValue}>{defaultValue} kbps</div>
			<input
				type="range"
				min={min}
				max={max}
				step={100}
				defaultValue={defaultValue}
				onInput={(e) => {
					const v = Number((e.target as HTMLInputElement).value);
					if (displayRef.current) displayRef.current.textContent = `${v} kbps`;
					onChange(v);
				}}
				className={styles.bitrateSlider}
			/>
		</>
	);
});

const CamerasPage = () => {
	const [, showSnackbar] = useAlert();
	const [ros] = useRosBridge(showSnackbar);
	const navBwMbps = useNavCameraBandwidth(ros);
	const roverBwMbps = useRoverCameraBandwidth(ros);
	const allCameraIds = useMemo(() => CAMERA_DEFS.map((camera) => camera.id), []);
	const [hubMinimized, setHubMinimized] = useState(false);
	const [viewMode, setViewMode] = useState<"all" | "custom">("all");
	const [customCameraIds, setCustomCameraIds] = useState<string[]>(allCameraIds);
	const [rotateCams, setRotateCams] = useState<number[]>(getDefaultRotations(allCameraIds));
	const [cameraSources, setCameraSources] = useState<CameraSourceMap>(() => loadCameraSources());
	const [gstStats, setGstStats] = useState<Record<string, CameraStreamStats>>({});
	const rosRef = useRef(ros);
	rosRef.current = ros;
	const csBitrateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const navBitrateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const zedBitrateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hdBitrateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const applyBitrate = useCallback((value: number, rosConn: ROSLIB.Ros | null) => {
		if (csBitrateDebounceRef.current) clearTimeout(csBitrateDebounceRef.current);
		csBitrateDebounceRef.current = setTimeout(() => {
			if (!rosConn) return;
			const svc = new ROSLIB.Service({
				ros: rosConn,
				name: "/ROVER/gst_cs_camera_bridge/set_parameters",
				serviceType: "rcl_interfaces/srv/SetParameters",
			});
			svc.callService(
				{ parameters: [{ name: "bitrate", value: { type: 2, integer_value: value } }] },
				() => {},
				(err) => console.error("[CS bitrate] set_parameters failed:", err)
			);
		}, 300);
	}, []);

	const applyNavBitrate = useCallback((value: number, rosConn: ROSLIB.Ros | null) => {
		if (navBitrateDebounceRef.current) clearTimeout(navBitrateDebounceRef.current);
		navBitrateDebounceRef.current = setTimeout(() => {
			if (!rosConn) return;
			const svc = new ROSLIB.Service({
				ros: rosConn,
				name: "/NAV/gst_camera_bridge/set_parameters",
				serviceType: "rcl_interfaces/srv/SetParameters",
			});
			svc.callService(
				{ parameters: [{ name: "bitrate", value: { type: 2, integer_value: value } }] },
				() => {},
				(err) => console.error("[NAV bitrate] set_parameters failed:", err)
			);
		}, 300);
	}, []);

	const applyZedBitrate = useCallback((value: number, rosConn: ROSLIB.Ros | null) => {
		if (zedBitrateDebounceRef.current) clearTimeout(zedBitrateDebounceRef.current);
		zedBitrateDebounceRef.current = setTimeout(() => {
			if (!rosConn) return;
			const svc = new ROSLIB.Service({
				ros: rosConn,
				name: "/zed_gst_bridge/set_parameters",
				serviceType: "rcl_interfaces/srv/SetParameters",
			});
			svc.callService(
				{ parameters: [{ name: "bitrate", value: { type: 2, integer_value: value } }] },
				() => {},
				(err) => console.error("[ZED bitrate] set_parameters failed:", err)
			);
		}, 300);
	}, []);

	const applyHdBitrate = useCallback((value: number, rosConn: ROSLIB.Ros | null) => {
		if (hdBitrateDebounceRef.current) clearTimeout(hdBitrateDebounceRef.current);
		hdBitrateDebounceRef.current = setTimeout(() => {
			if (!rosConn) return;
			const svc = new ROSLIB.Service({
				ros: rosConn,
				name: "/HD/gst_hd_camera_bridge/set_parameters",
				serviceType: "rcl_interfaces/srv/SetParameters",
			});
			svc.callService(
				{ parameters: [{ name: "bitrate", value: { type: 2, integer_value: value } }] },
				() => {},
				(err) => console.error("[HD bitrate] set_parameters failed:", err)
			);
		}, 300);
	}, []);

	const onCsBitrateChange = useCallback((v: number) => applyBitrate(v, rosRef.current), [applyBitrate]);
	const onNavBitrateChange = useCallback((v: number) => applyNavBitrate(v, rosRef.current), [applyNavBitrate]);
	const onZedBitrateChange = useCallback((v: number) => applyZedBitrate(v, rosRef.current), [applyZedBitrate]);
	const onHdBitrateChange = useCallback((v: number) => applyHdBitrate(v, rosRef.current), [applyHdBitrate]);

	useEffect(() => {
		try {
			window.localStorage.setItem(CAMERA_SOURCE_STORAGE_KEY, JSON.stringify(cameraSources));
		} catch {
			// Ignore storage failures; the default GStreamer mode still applies next load.
		}
	}, [cameraSources]);

	useEffect(() => {
		let canceled = false;
		const loadStats = async () => {
			try {
				const response = await fetch(`${getCameraBackendBaseUrl()}/camera-streams/stats`);
				if (!response.ok) return;
				const next = (await response.json()) as Record<string, CameraStreamStats>;
				if (!canceled) setGstStats(next);
			} catch {
				if (!canceled) setGstStats({});
			}
		};
		loadStats();
		const timer = window.setInterval(loadStats, 1000);
		return () => {
			canceled = true;
			window.clearInterval(timer);
		};
	}, []);

	const displayedCameraIds = viewMode === "all" ? allCameraIds : customCameraIds;
	const navigationPanoramaLayout = useMemo(
		() =>
			viewMode === "custom" &&
			displayedCameraIds.length === 4 &&
			displayedCameraIds[0] === "nav_right" &&
			displayedCameraIds[1] === "nav_left" &&
			displayedCameraIds[2] === "nav_back" &&
			displayedCameraIds[3] === "nav_front",
		[viewMode, displayedCameraIds]
	);
	const displayedCameras = useMemo(() => {
		const byId = new Map<string, CameraDef>();
		for (const c of CAMERA_DEFS) {
			byId.set(c.id, c);
		}
		return displayedCameraIds
			.map((id) => byId.get(id))
			.filter((c): c is CameraDef => c != null);
	}, [displayedCameraIds]);
	const activeTopics = useMemo(
		() =>
			displayedCameras
				.filter((camera) => cameraSources[camera.id] === "ros")
				.map((camera) => camera.topic),
		[displayedCameras, cameraSources]
	);
	const [imagesByTopic] = useCamera(ros, activeTopics);
	const images = useMemo(
		() =>
			displayedCameras.map((camera) =>
				cameraSources[camera.id] === "ros"
					? imagesByTopic[camera.topic] ?? ""
					: getCameraStreamUrl(camera)
			),
		[displayedCameras, cameraSources, imagesByTopic]
	);
	const streamKinds = useMemo<Array<"img" | "video">>(
		() =>
			displayedCameras.map((camera) =>
				cameraSources[camera.id] === "gst" && FMP4_CAMERAS.has(camera.id) ? "video" : "img"
			),
		[displayedCameras, cameraSources]
	);
	const videoElsRef = useRef(new Map<number, HTMLVideoElement>());
	const registerVideoEl = useCallback((index: number, el: HTMLVideoElement | null) => {
		if (el) videoElsRef.current.set(index, el);
		else videoElsRef.current.delete(index);
	}, []);
	const imgElsRef = useRef(new Map<number, HTMLImageElement>());
	const registerImgEl = useCallback((index: number, el: HTMLImageElement | null) => {
		if (el) imgElsRef.current.set(index, el);
		else imgElsRef.current.delete(index);
	}, []);
	const topicNames = useMemo(
		() => displayedCameras.map((camera) => camera.name),
		[displayedCameras]
	);
	// Stable per-cell identity for zoom reset — unlike topicPaths, never embeds live bandwidth text.
	const feedIds = useMemo(
		() => displayedCameras.map((camera) => camera.id),
		[displayedCameras]
	);
	const alignOverlays = useMemo(
		() => displayedCameras.map((camera) => MAINTENANCE_ALIGN_OVERLAYS[camera.id] ?? null),
		[displayedCameras]
	);
	const topicPaths = useMemo(
		() =>
			displayedCameras.map((camera) => {
				if (cameraSources[camera.id] === "gst") {
					const stats = gstStats[camera.id];
					// Kernel-level drops are the one failure this UI was previously blind to: they
					// happen upstream of every counter the backend keeps, so a shredded feed could
					// still report a healthy bitrate.
					const drops = stats && stats.drops ? ` drops:${stats.drops}` : "";
					if (!stats || !stats.active) {
						return `GStreamer UDP:${camera.gstPort} (no packets)${drops}`;
					}
					if (stats.transport === "fmp4") {
						return `H.264 passthrough UDP:${camera.gstPort} (${stats.mbps.toFixed(2)} Mbps)${drops}`;
					}
					return `GStreamer UDP:${camera.gstPort} (${stats.mbps.toFixed(2)} Mbps wire, ${stats.overheadMbps.toFixed(2)} Mbps overhead)${drops}`;
				}

				const topic = camera.topic;
				let bw: number | undefined;
				if (topic.startsWith("/CS/feed_camera_nav_")) {
					const idx = Number(topic.slice("/CS/feed_camera_nav_".length));
					bw = Number.isFinite(idx) ? navBwMbps[idx as 0 | 1 | 2 | 3] : undefined;
				} else if (topic === "/ROVER/feed_camera_cs_top") {
					bw = roverBwMbps[0];
				} else if (topic === "/ROVER/feed_camera_cs_right_steer") {
					bw = roverBwMbps[1];
				} else if (topic === "/ROVER/feed_camera_cs_left_steer") {
					bw = roverBwMbps[2];
				}

				if (bw === undefined) return topic;
				return `${topic} (${bw.toFixed(1)} Mbps)`;
			}),
		[displayedCameras, cameraSources, gstStats, navBwMbps, roverBwMbps]
	);
	const currentCam = useMemo(
		() => [viewMode === "all" ? "All Cams" : "Custom"] as string[],
		[viewMode]
	);
	const changeCam = useCallback(() => {}, []);

	const setCustomLayout = (cameraIds: readonly string[]) => {
		setViewMode("custom");
		const allowed = new Set<string>(allCameraIds);
		const ordered = normalizeFrontStereoOrder(cameraIds.filter((id) => allowed.has(id)));
		setCustomCameraIds(ordered);
		setRotateCams(getDefaultRotations(ordered));
	};

	const switchToAll = () => {
		setViewMode("all");
		setCustomCameraIds(allCameraIds);
		setRotateCams(getDefaultRotations(allCameraIds));
	};

	const toggleCameraSource = (cameraId: CameraId) => {
		setCameraSources((previous) => ({
			...previous,
			[cameraId]: previous[cameraId] === "ros" ? "gst" : "ros",
		}));
	};

	const toggleSingleCamera = (cameraId: string) => {
		setViewMode("custom");
		setCustomCameraIds((previous) => {
			const isActive = previous.includes(cameraId);
			let next = previous;
			if (isActive) {
				next = previous.filter((id) => id !== cameraId);
			} else {
				next = allCameraIds.filter((id) => previous.includes(id) || id === cameraId);
			}
			next = normalizeFrontStereoOrder(next);
			setRotateCams(getDefaultRotations(next));
			return next;
		});
	};

	const removeCameraByIndexRef = useRef((_index: number) => {});
	removeCameraByIndexRef.current = (index: number) => {
		const idToRemove = displayedCameras[index]?.id;
		if (!idToRemove) return;

		setViewMode("custom");
		const oldIds = displayedCameraIds;
		const oldRot = rotateCams;
		const filtered = oldIds.filter((id) => id !== idToRemove);
		const nextIds = normalizeFrontStereoOrder(filtered);
		const nextRot = nextIds.map((id) => {
			const i = oldIds.indexOf(id);
			return i >= 0 ? (oldRot[i] ?? 0) : 0;
		});
		setCustomCameraIds(nextIds);
		setRotateCams(nextRot);
	};
	const removeCameraByIndex = useCallback((index: number) => removeCameraByIndexRef.current(index), []);

	/** Grab one displayed feed's current frame as a bounded JPEG data URL, or null if unavailable.
	 *  Every branch draws from what is already decoded on screen — no feed opens a second connection
	 *  to the rover unless the on-screen element is somehow missing. */
	const captureCameraFrame = useCallback(
		async (index: number, camera: CameraDef): Promise<string | null> => {
			const source = cameraSources[camera.id];

			if (source === "ros") {
				// Already a compressed frame in memory. Leave small ones exactly as received; only
				// downscale the rare oversized one so the upload body stays sane.
				const raw = imagesByTopic[camera.topic] ?? null;
				if (!raw) return null;
				if (raw.length * 0.75 <= SCREENSHOT_REENCODE_BYTES) return raw;
				const decoded = await decodeImage(raw, false);
				if (!decoded) return raw;
				return (
					(await frameToBoundedJpeg(decoded, decoded.naturalWidth, decoded.naturalHeight)) ??
					raw
				);
			}

			if (FMP4_CAMERAS.has(camera.id)) {
				// An MSE stream cannot be re-opened into an Image() — a second connection only yields
				// MP4 bytes. The on-screen <video> is the only source.
				const video = videoElsRef.current.get(index);
				if (video && video.videoWidth > 0) {
					return frameToBoundedJpeg(video, video.videoWidth, video.videoHeight);
				}
				return null;
			}

			// MJPEG: the on-screen <img> is already decoding this stream in real time. Draw straight
			// from it instead of opening a fresh connection and waiting for a keyframe.
			const liveImg = imgElsRef.current.get(index);
			if (liveImg && liveImg.complete && liveImg.naturalWidth > 0) {
				const fromScreen = await frameToBoundedJpeg(
					liveImg,
					liveImg.naturalWidth,
					liveImg.naturalHeight,
				);
				if (fromScreen) return fromScreen;
			}
			// Fallback only: element not mounted yet, or the draw tainted the canvas somehow.
			const refetched = await decodeImage(getCameraStreamUrl(camera), true);
			if (!refetched) return null;
			return frameToBoundedJpeg(
				refetched,
				refetched.naturalWidth || 640,
				refetched.naturalHeight || 480,
			);
		},
		[cameraSources, imagesByTopic],
	);

	const saveCameraScreenshots = useCallback(async (): Promise<{ saved: number; failed: number }> => {
		const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
		const backendUrl = getCameraBackendBaseUrl();
		const cameras = displayedCameras;

		// Capture every feed at once so one slow camera doesn't hold up the rest.
		const frames = await Promise.all(
			cameras.map((camera, i) => captureCameraFrame(i, camera).catch(() => null)),
		);

		// Each screenshot is its own request (well under the backend's 25 MB body cap regardless of
		// camera resolution); fire them together too.
		const outcomes = await Promise.all(
			frames.map(async (dataUrl, i) => {
				if (!dataUrl) return false;
				const camera = cameras[i];
				try {
					const response = await fetch(`${backendUrl}/save-screenshot`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							cameraName: camera.name.replace(/\s+/g, "_"),
							filename: `${ts}.jpg`,
							imageData: dataUrl,
						}),
					});
					return response.ok;
				} catch (err) {
					console.error("[save-screenshot]", err);
					return false;
				}
			}),
		);

		const saved = outcomes.filter(Boolean).length;
		return { saved, failed: outcomes.length - saved };
	}, [displayedCameras, captureCameraFrame]);

	const drillCamera = CAMERA_DEFS.find((c) => c.id === "drill_inside")!;

	/** The advertise callback is registered once per connection, so it must not close over a stale
	 *  `saveCameraScreenshots` (which changes whenever the displayed cameras do). */
	const saveCameraScreenshotsRef = useRef(saveCameraScreenshots);
	saveCameraScreenshotsRef.current = saveCameraScreenshots;

	/**
	 * `/SC/take_picture_drill` is served *by* the control station: the drill node calls it, this page
	 * captures every displayed feed. Only advertised while the cameras page is mounted — a call made
	 * with the page closed fails on the drill side, which is the intended signal.
	 */
	useEffect(() => {
		if (!ros) return;
		const srv = new ROSLIB.Service<
			Record<string, never>,
			{ success: boolean; message: string }
		>({
			ros,
			name: "/SC/take_picture_drill",
			serviceType: "std_srvs/srv/Trigger",
		});
		// advertiseAsync, not advertise: the response must wait until the frames are on disk, so the
		// drill learns whether the capture actually succeeded.
		srv.advertiseAsync(async () => {
			try {
				const { saved, failed } = await saveCameraScreenshotsRef.current();
				return {
					success: saved > 0,
					message:
						saved > 0
							? `saved ${saved} screenshot(s)${failed > 0 ? `, ${failed} failed` : ""}`
							: "no camera frame could be captured",
				};
			} catch (err) {
				return { success: false, message: `capture failed: ${String(err)}` };
			}
		});
		return () => {
			try {
				srv.unadvertise();
			} catch {
				// Connection already torn down; rosbridge drops the advertisement with the client.
			}
		};
	}, [ros]);

	return (
		<div className={"page " + styles.mainPage}>
			<Background />
			<div className={styles.control}>
				<div className={`${styles.leftHub} ${hubMinimized ? styles.leftHubMinimized : ""}`}>
					<button
						type="button"
						className={styles.leftHubToggle}
						onClick={() => setHubMinimized((prev) => !prev)}
						title={hubMinimized ? "Expand panel" : "Minimize panel"}
					>
						{hubMinimized ? "›" : "‹"}
					</button>
					{!hubMinimized && (
						<>
							<button
								type="button"
								className={`${styles.hubButton} ${viewMode === "all" ? styles.hubButtonActive : ""}`}
								onClick={switchToAll}
							>
								All Cams
							</button>
							<button
								type="button"
								className={`${styles.hubButton} ${viewMode === "custom" ? styles.hubButtonActive : ""}`}
								onClick={() => setViewMode("custom")}
							>
								Custom
							</button>
							<div className={styles.hubDivider} />
							<div className={styles.hubSectionTitle}>Individual Cameras</div>
							{CAMERA_DEFS.map((camera) => {
								const isActive = displayedCameraIds.includes(camera.id);
								const source = cameraSources[camera.id];
								return (
									<div key={camera.id} className={styles.cameraButtonRow}>
										<button
											type="button"
											className={`${styles.hubButton} ${styles.cameraVisibilityButton} ${
												isActive ? styles.hubButtonActive : ""
											}`}
											onClick={() => toggleSingleCamera(camera.id)}
										>
											{camera.name}
										</button>
										<button
											type="button"
											className={`${styles.sourceToggle} ${
												source === "ros" ? styles.sourceToggleRos : ""
											}`}
											title={`${camera.name}: ${source === "gst" ? "GStreamer" : "ROS"} feed`}
											onClick={() => toggleCameraSource(camera.id)}
										>
											{source.toUpperCase()}
										</button>
									</div>
								);
							})}
							<div className={styles.hubDivider} />
							<div className={styles.hubSectionTitle}>Task Presets</div>
							{TASK_PRESETS.map((preset) => (
								<button
									type="button"
									key={preset.label}
									className={`${styles.hubButton} ${
										isNavigationPanoramaPreset(preset) ? styles.hubButtonNavPreset : ""
									}`}
									onClick={() => setCustomLayout(preset.cameraIds)}
								>
									{isNavigationPanoramaPreset(preset) ? (
										<span className={styles.navPresetButtonInner}>
											<span className={styles.navPresetRow}>
												<span className={styles.navPresetCell} aria-hidden />
												<span className={styles.navPresetCell} aria-hidden />
											</span>
											<span className={styles.navPresetRow}>
												<span className={styles.navPresetCell} aria-hidden />
												<span className={styles.navPresetCell} aria-hidden />
											</span>
										</span>
									) : null}
									<span className={styles.navPresetLabel}>{preset.label}</span>
								</button>
							))}
							<div className={styles.hubDivider} />
							<button
								type="button"
								className={styles.hubButton}
								onClick={() => { void saveCameraScreenshots(); }}
							>
								Download Screenshots
							</button>
							<div className={styles.hubDivider} />
							<BitrateSlider label="RPI CS Cams Bitrate" defaultValue={1000} min={100} max={4000} onChange={onCsBitrateChange} />
							<BitrateSlider label="NAV Cams Bitrate" defaultValue={1000} min={100} max={4000} onChange={onNavBitrateChange} />
							<BitrateSlider label="ZED Front Cam Bitrate" defaultValue={1000} min={100} max={8000} onChange={onZedBitrateChange} />
							<BitrateSlider label="HD Gripper Cam Bitrate" defaultValue={1000} min={100} max={4000} onChange={onHdBitrateChange} />
						</>
					)}
				</div>
				<div className={styles.visualization}>
					<CameraView
						images={images}
						rotate={rotateCams}
						setRotateCams={setRotateCams}
						currentCam={currentCam}
						topicNames={topicNames}
						topicPaths={topicPaths}
						feedIds={feedIds}
						alignOverlays={alignOverlays}
						streamKinds={streamKinds}
						registerVideoEl={registerVideoEl}
						registerImgEl={registerImgEl}
						changeCam={changeCam}
						forceGrid={true}
						navigationPanoramaLayout={navigationPanoramaLayout}
						showSelector={false}
						showRemoveButton={true}
						onRemoveCam={removeCameraByIndex}
					/>
				</div>
			</div>
		</div>
	);
};

export default CamerasPage;
