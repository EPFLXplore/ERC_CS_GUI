import styles from "./styles.module.sass";
import CameraView from "../../components/data/CameraView";
import Background from "../../components/ui/Background";
import useCamera from "../../hooks/cameraHooks";
import useAlert from "../../hooks/alertHooks";
import useRosBridge from "../../hooks/rosbridgeHooks";
import { useMemo, useState } from "react";

const CAMERA_DEFS = [
    { id: "nav_front",  name: "Front Cam",  source: { type: "ros" as const, topic: "/NAV/feed_camera_nav_0" } },
    { id: "hd_gripper", name: "Gripper Cam", source: { type: "ros" as const, topic: "/ROVER/feed_camera_hd_0" } },
    { id: "cs_nav_0",   name: "CS Nav 0",   source: { type: "gst" as const, url: "http://localhost:8080" } },
    { id: "cs_nav_1",   name: "CS Nav 1",   source: { type: "gst" as const, url: "http://localhost:8081" } },
    { id: "cs_nav_2",   name: "CS Nav 2",   source: { type: "gst" as const, url: "http://localhost:8082" } },
    { id: "cs_nav_3",   name: "CS Nav 3",   source: { type: "gst" as const, url: "http://localhost:8083" } },
] as const;

const TASK_PRESETS = [
	{ label: "Navigation", cameraIds: ["nav_front", "nav_left", "nav_right", "nav_aux"] },
	{ label: "Manipulation", cameraIds: ["hd_gripper", "nav_front", "cs_nav_0", "cs_nav_1"] },
	{ label: "Exploration", cameraIds: ["nav_front", "cs_nav_0", "cs_nav_1", "cs_nav_2", "cs_nav_3"] },
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
	const [imagesByKey] = useCamera(ros, displayedCameras);
	const images = displayedCameras.map((camera) => imagesByKey[camera.id] ?? "");
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
