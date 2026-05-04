import styles from "./styles.module.sass";
import CameraView from "../../components/data/CameraView";
import Background from "../../components/ui/Background";
import useCamera from "../../hooks/cameraHooks";
import useAlert from "../../hooks/alertHooks";
import useRosBridge from "../../hooks/rosbridgeHooks";
import { useMemo, useState } from "react";

const CAMERA_DEFS = [
	{ id: "nav_front", name: "Behind", topic: "/NAV/feed_camera_nav_0" },
	{ id: "hd_gripper", name: "Gripper Cam", topic: "/ROVER/feed_camera_hd_0" },
	{ id: "cs_st_0", name: "ST", topic: "/CS/feed_camera_cs_0" },
	{ id: "cs_st_1", name: "ST", topic: "/CS/feed_camera_cs_1" },
	{ id: "cs_dr", name: "DR", topic: "/CS/feed_camera_cs_2" },
	{ id: "cs_bh", name: "BH", topic: "/CS/feed_camera_cs_3" },
	{ id: "nav_left", name: "Top Right", topic: "/NAV/feed_camera_nav_1" },
	{ id: "nav_right", name: "Top Left", topic: "/NAV/feed_camera_nav_2" },
	{ id: "nav_aux", name: "NAV 3", topic: "/NAV/feed_camera_nav_3" },
	{ id: "cs_other_1", name: "Other1", topic: "/CS/feed_camera_cs_4" },
	{ id: "cs_other_2", name: "Other2", topic: "/CS/feed_camera_cs_5" },
] as const;

type CameraDef = (typeof CAMERA_DEFS)[number];

const TASK_PRESETS = [
	{ label: "Navigation", cameraIds: ["nav_right", "nav_left", "nav_front"] },
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
		preset.cameraIds.length === 3 &&
		preset.cameraIds[0] === "nav_right" &&
		preset.cameraIds[1] === "nav_left" &&
		preset.cameraIds[2] === "nav_front"
	);
}

const CamerasPage = () => {
	const [, showSnackbar] = useAlert();
	const [ros] = useRosBridge(showSnackbar);
	const allCameraIds = useMemo(() => CAMERA_DEFS.map((camera) => camera.id), []);
	const [viewMode, setViewMode] = useState<"all" | "custom">("all");
	const [customCameraIds, setCustomCameraIds] = useState<string[]>(allCameraIds);
	const [rotateCams, setRotateCams] = useState<number[]>(getDefaultRotations(allCameraIds));

	const displayedCameraIds = viewMode === "all" ? allCameraIds : customCameraIds;
	const navigationPanoramaLayout = useMemo(
		() =>
			viewMode === "custom" &&
			displayedCameraIds.length === 3 &&
			displayedCameraIds[0] === "nav_right" &&
			displayedCameraIds[1] === "nav_left" &&
			displayedCameraIds[2] === "nav_front",
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
		() => displayedCameras.map((camera) => camera.topic),
		[displayedCameras]
	);
	const [imagesByTopic] = useCamera(ros, activeTopics);
	const images = displayedCameras.map((camera) => imagesByTopic[camera.topic] ?? "");
	const topicNames = displayedCameras.map((camera) => camera.name);

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
									<span className={styles.navPresetBehind} aria-hidden />
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
