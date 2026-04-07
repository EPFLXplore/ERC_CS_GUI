import styles from "./styles.module.sass";
import CameraView from "../../components/data/CameraView";
import Background from "../../components/ui/Background";
import useCamera from "../../hooks/cameraHooks";
import useAlert from "../../hooks/alertHooks";
import useRosBridge from "../../hooks/rosbridgeHooks";
import { useMemo, useState } from "react";

const CAMERA_DEFS = [
	{ id: "nav_front", name: "Front Cam", topic: "/NAV/feed_camera_nav_0" },
	{ id: "hd_gripper", name: "Gripper Cam", topic: "/ROVER/feed_camera_hd_0" },
	{ id: "cs_st_0", name: "ST", topic: "/CS/feed_camera_cs_0" },
	{ id: "cs_st_1", name: "ST", topic: "/CS/feed_camera_cs_1" },
	{ id: "cs_dr", name: "DR", topic: "/CS/feed_camera_cs_2" },
	{ id: "cs_bh", name: "BH", topic: "/CS/feed_camera_cs_3" },
	{ id: "nav_left", name: "LEFT", topic: "/NAV/feed_camera_nav_1" },
	{ id: "nav_right", name: "RIGHT", topic: "/NAV/feed_camera_nav_2" },
	{ id: "nav_aux", name: "NAV 3", topic: "/NAV/feed_camera_nav_3" },
	{ id: "cs_other_1", name: "Other1", topic: "/CS/feed_camera_cs_4" },
	{ id: "cs_other_2", name: "Other2", topic: "/CS/feed_camera_cs_5" },
] as const;

const TASK_PRESETS = [
	{ label: "Navigation", cameraIds: ["nav_front", "nav_left", "nav_right", "nav_aux"] },
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

const CamerasPage = () => {
	const [, showSnackbar] = useAlert();
	const [ros] = useRosBridge(showSnackbar);
	const allCameraIds = useMemo(() => CAMERA_DEFS.map((camera) => camera.id), []);
	const [viewMode, setViewMode] = useState<"all" | "custom">("all");
	const [customCameraIds, setCustomCameraIds] = useState<string[]>(allCameraIds);
	const [rotateCams, setRotateCams] = useState<number[]>(getDefaultRotations(allCameraIds));

	const displayedCameraIds = viewMode === "all" ? allCameraIds : customCameraIds;
	const displayedCameras = useMemo(
		() => CAMERA_DEFS.filter((camera) => displayedCameraIds.includes(camera.id)),
		[displayedCameraIds]
	);
	const activeTopics = useMemo(
		() => displayedCameras.map((camera) => camera.topic),
		[displayedCameras]
	);
	const [imagesByTopic] = useCamera(ros, activeTopics);
	const images = displayedCameras.map((camera) => imagesByTopic[camera.topic] ?? "");
	const topicNames = displayedCameras.map((camera) => camera.name);

	const setCustomLayout = (cameraIds: readonly string[]) => {
		setViewMode("custom");
		const asSet = new Set(cameraIds);
		const ordered = allCameraIds.filter((id) => asSet.has(id));
		setCustomCameraIds(ordered);
		setRotateCams(getDefaultRotations(ordered));
	};

	const switchToAll = () => {
		setViewMode("all");
		setCustomCameraIds(allCameraIds);
		setRotateCams(getDefaultRotations(allCameraIds));
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
			setRotateCams(getDefaultRotations(next));
			return next;
		});
	};

	const removeCameraByIndex = (index: number) => {
		setViewMode("custom");
		setCustomCameraIds((previous) => {
			const idToRemove = displayedCameras[index]?.id;
			if (!idToRemove) {
				return previous;
			}
			return previous.filter((id) => id !== idToRemove);
		});
		setRotateCams((previous) => {
			const next = previous.slice();
			next.splice(index, 1);
			return next;
		});
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
						return (
							<button
								type="button"
								key={camera.id}
								className={`${styles.hubButton} ${isActive ? styles.hubButtonActive : ""}`}
								onClick={() => toggleSingleCamera(camera.id)}
							>
								{camera.name}
							</button>
						);
					})}
					<div className={styles.hubDivider} />
					<div className={styles.hubSectionTitle}>Task Presets</div>
					{TASK_PRESETS.map((preset) => (
						<button
							type="button"
							key={preset.label}
							className={styles.hubButton}
							onClick={() => setCustomLayout(preset.cameraIds)}
						>
							{preset.label}
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
						changeCam={() => {}}
						forceGrid={true}
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
