import styles from "./styles.module.sass";
import CameraView from "../../components/data/CameraView";
import Background from "../../components/ui/Background";
import useCamera from "../../hooks/cameraHooks";
import useAlert from "../../hooks/alertHooks";
import useRosBridge from "../../hooks/rosbridgeHooks";
import useNavCameraBandwidth from "../../hooks/useNavCameraBandwidth";
import useRoverCameraBandwidth from "../../hooks/useRoverCameraBandwidth";
import { Topics } from "../../data/topics.type";
import { useEffect, useMemo, useState } from "react";

const CAMERA_DEFS = [
	{ id: "nav_front", name: "Front", topic: Topics.NAV_FRONT_CAMERA_COMPRESSED, gstPort: 5006 },
	{ id: "hd_gripper", name: "Gripper Cam", topic: "/ROVER/feed_camera_hd_0", gstPort: 5008 },
	{ id: "up", name: "Up", topic: "/ROVER/feed_camera_cs_0", gstPort: 5010 },
	{ id: "cs_st_0", name: "ST", topic: "/CS/feed_camera_cs_0", gstPort: 5012 },
	{ id: "cs_st_1", name: "ST", topic: "/CS/feed_camera_cs_1", gstPort: 5014 },
	{ id: "cs_dr", name: "DR", topic: "/CS/feed_camera_cs_2", gstPort: 5016 },
	{ id: "cs_bh", name: "BH", topic: "/CS/feed_camera_cs_3", gstPort: 5018 },
	{ id: "nav_back", name: "Back", topic: "/CS/feed_camera_nav_0", gstPort: 5000 },
	{ id: "nav_left", name: "Top Right", topic: "/CS/feed_camera_nav_1", gstPort: 5002 },
	{ id: "nav_right", name: "Top Left", topic: "/CS/feed_camera_nav_2", gstPort: 5004 },
	{ id: "cs_other_1", name: "Other1", topic: "/CS/feed_camera_cs_4", gstPort: 5020 },
	{ id: "cs_other_2", name: "Other2", topic: "/CS/feed_camera_cs_5", gstPort: 5022 },
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
	{ label: "Manipulation", cameraIds: ["hd_gripper", "nav_front", "cs_st_0", "cs_dr"] },
	{ label: "Exploration", cameraIds: ["nav_front", "cs_st_0", "cs_st_1", "cs_dr", "cs_bh"] },
	{ label: "Astro-Bio", cameraIds: ["cs_other_1", "cs_other_2", "nav_front"] },
	{ label: "Probing", cameraIds: ["hd_gripper", "nav_front", "cs_st_0", "cs_dr"] },
	{ label: "Sampling", cameraIds: ["hd_gripper", "cs_other_1", "cs_other_2", "cs_st_0"] },
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

function getCameraStreamUrl(cameraId: CameraId): string {
	return `${getCameraBackendBaseUrl()}/camera-streams/${cameraId}.mjpg`;
}

function getCameraBackendBaseUrl(): string {
	if (typeof window === "undefined") return "";
	const protocol = window.location.protocol || "http:";
	const hostname = window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname;
	return `${protocol}//${hostname}:5000`;
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
	const images = displayedCameras.map((camera) =>
		cameraSources[camera.id] === "ros"
			? imagesByTopic[camera.topic] ?? ""
			: getCameraStreamUrl(camera.id)
	);
	const topicNames = displayedCameras.map((camera) => camera.name);
	const topicPaths = displayedCameras.map((camera) => {
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
		} else if (topic === "/ROVER/feed_camera_cs_0") {
			bw = roverBwMbps[0];
		}

		if (bw === undefined) return topic;
		return `${topic} (${bw.toFixed(1)} Mbps)`;
	});

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

	const removeCameraByIndex = (index: number) => {
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
				</div>
				<div className={styles.visualization}>
					<CameraView
						images={images}
						rotate={rotateCams}
						setRotateCams={setRotateCams}
						currentCam={[viewMode === "all" ? "All Cams" : "Custom"]}
						topicNames={topicNames}
						topicPaths={topicPaths}
						changeCam={() => {}}
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
