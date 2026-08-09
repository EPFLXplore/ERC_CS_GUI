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

const CAMERA_DEFS = [
	{ id: "nav_front", name: "Front", topic: Topics.NAV_FRONT_CAMERA_COMPRESSED, gstPort: 5006 },
	{ id: "hd_gripper", name: "Gripper Cam", topic: "/ROVER/feed_camera_hd_0", gstPort: 5013 },
	{ id: "cs_top", name: "CS Top", topic: "/ROVER/feed_camera_cs_top", gstPort: 5008 },
	{ id: "cs_right_steer", name: "Right Steer", topic: "/ROVER/feed_camera_cs_right_steer", gstPort: 5010 },
	{ id: "cs_left_steer", name: "Left Steer", topic: "/ROVER/feed_camera_cs_left_steer", gstPort: 5012 },
	{ id: "nav_back", name: "Back", topic: "/CS/feed_camera_nav_0", gstPort: 5000 },
	{ id: "nav_left", name: "Top Right", topic: "/CS/feed_camera_nav_1", gstPort: 5002 },
	{ id: "nav_right", name: "Top Left", topic: "/CS/feed_camera_nav_2", gstPort: 5004 },
	{ id: "drill_inside", name: "Drill Inside", topic: "/ROVER/feed_camera_cs_drill_inside", gstPort: 5016 },
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
};

const CAMERA_SOURCE_STORAGE_KEY = "erc-cs-camera-feed-sources-v1";

const DEFAULT_CAMERA_SOURCES = CAMERA_DEFS.reduce((acc, camera) => {
	acc[camera.id] = "gst";
	return acc;
}, {} as CameraSourceMap);

const TASK_PRESETS = [
	{ label: "Navigation", cameraIds: ["nav_right", "nav_left", "nav_back", "nav_front"] },
	{ label: "Manipulation", cameraIds: ["hd_gripper", "nav_front", "cs_top", "cs_right_steer"] },
	{ label: "Exploration", cameraIds: ["nav_front", "cs_top", "cs_right_steer", "cs_left_steer"] },
	{ label: "Astro-Bio", cameraIds: ["cs_top", "cs_right_steer", "nav_front"] },
	{ label: "Probing", cameraIds: ["hd_gripper", "nav_front", "cs_top", "cs_right_steer"] },
	{ label: "Sampling", cameraIds: ["hd_gripper", "cs_top", "cs_right_steer", "cs_left_steer"] },
] as const;

const getDefaultRotationByCameraId = (cameraId: string): number => {
	if (cameraId === "hd_gripper") {
		return 180;
	}

	return 0;
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
	return `${getCameraBackendBaseUrl(camera.gstPort + CAMERA_HTTP_PORT_OFFSET)}/camera-streams/${camera.id}.mjpg`;
}

function getCameraBackendBaseUrl(port: number = 5000): string {
	if (typeof window === "undefined") return "";
	const protocol = window.location.protocol || "http:";
	const hostname = window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname;
	return `${protocol}//${hostname}:${port}`;
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
	const topicNames = useMemo(
		() => displayedCameras.map((camera) => camera.name),
		[displayedCameras]
	);
	const topicPaths = useMemo(
		() =>
			displayedCameras.map((camera) => {
				if (cameraSources[camera.id] === "gst") {
					const stats = gstStats[camera.id];
					if (!stats || !stats.active) {
						return `GStreamer UDP:${camera.gstPort} (no packets)`;
					}
					return `GStreamer UDP:${camera.gstPort} (${stats.mbps.toFixed(2)} Mbps wire, ${stats.overheadMbps.toFixed(2)} Mbps overhead)`;
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

	return (
		<div className={"page " + styles.mainPage}>
			<Background />
			<div className={styles.control}>
				<div className={styles.leftHub}>
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
					<BitrateSlider label="RPI CS Cams Bitrate" defaultValue={1000} min={100} max={4000} onChange={onCsBitrateChange} />
					<BitrateSlider label="NAV Cams Bitrate" defaultValue={1000} min={100} max={4000} onChange={onNavBitrateChange} />
					<BitrateSlider label="ZED Front Cam Bitrate" defaultValue={1000} min={100} max={8000} onChange={onZedBitrateChange} />
					<BitrateSlider label="HD Gripper Cam Bitrate" defaultValue={1000} min={100} max={4000} onChange={onHdBitrateChange} />
				</div>
				<div className={styles.visualization}>
					<CameraView
						images={images}
						rotate={rotateCams}
						setRotateCams={setRotateCams}
						currentCam={currentCam}
						topicNames={topicNames}
						topicPaths={topicPaths}
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
