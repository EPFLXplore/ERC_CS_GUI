// @ts-nocheck
import { ReactElement, useEffect, useState } from "react";
import styles from "./style.module.sass";
import { Size } from "../../utils/size.type";
import Timer from "../../components/Timer";
import ExpandButton from "../../components/ExpandButton";
import GamepadHint from "../../components/GamepadHint";
import QuickAction from "../../components/QuickAction";

import NavIcon from "../../assets/images/icons/nav_logo.png";
import HDIcon from "../../assets/images/icons/handling_device_logo.png";
import Stop from "../../assets/images/icons/stop.png";
import Drill from "../../assets/images/icons/drill.png";
import SystemMode from "../../components/SystemMode";
import Simulation from "../../components/Simulation";
import RoverData from "../../components/RoverData";

import requestChangeMode from "../../utils/changeSystemMode";

import logo from "../../assets/images/logos/logo_XPlore.png";
import useRoverState from "../../hooks/roverStateHooks";
import CameraViewRTC from "../../components/CameraViewRTC";
import useConnectWebRTC from "../../utils/connectWebRTC";
import cancelAllGoal from "../../utils/cancelAllActions";
import actionGoal from "../../utils/actionGoal";
import Action from "../../utils/Action";
import NavigationGoalModal from "../../components/NavigationGoalModal";

export default () => {
	const DEBUG = true;
	const MAX_CAMERAS = 2;
	const NBR_ACTIONS = 3;

	const [roverState] = useRoverState(DEBUG);
	const [dataOpen, setDataOpen] = useState(false);
	const [display, setDisplay] = useState("camera");

	const [systemsModalOpen, setSystemsModalOpen] = useState([
		[
			"navigation",
			new Action("navigation", false, [
				["drill", false],
				["handling_device", true],
			]),
		],
		["handling_device", new Action("handling_device", false, [])],
		[
			"drill",
			new Action("drill", false, [
				["navigation", false],
				["handling_device", true],
			]),
		],
		["cancel", false],
	]);
	const [modal, setModal] = useState<ReactElement | null>(null);
	const [videoSrc, videoId, setVideoId] = useConnectWebRTC();

	const [dataFocus, setDataFocus] = useState<string[]>([]);

	const displaySystemModal = (index: number) => {
		setSystemsModalOpen((old) => {
			const newModalOpen = [...old];
			return newModalOpen;
			// if (index == NBR_ACTIONS) {
			// 	// cancel all actions
			// 	cancelAllGoal()
			// 		.then((data) => data.json())
			// 		.then((values) => {
			// 			// values holds values with true or false if all actions are not on
			// 			console.log(values);
			// 			for (let i = 0; i < NBR_ACTIONS; i++) {
			// 				if (values["status"][i] == false) {
			// 					newModalOpen[i][1].status = false;
			// 				} else {
			// 					// should throw a pop up danger an action is on!!
			// 				}
			// 			}
			// 		})
			// 		.catch((err) => {
			// 			console.log(err);
			// 			// what do we do
			// 		});

			// 	return newModalOpen;
			// } else {
			// 	if (old[index][1].status) {
			// 		// this action is already running, cancel it or just do nothing?
			// 		actionGoal(old[index][0], false)
			// 			.then((data) => {
			// 				return data.json();
			// 			})
			// 			.then((values) => {
			// 				if (values["status"] == false) {
			// 					newModalOpen[index][1].status = false;
			// 				} else {
			// 					// error the action has not been canceled!
			// 				}
			// 			})
			// 			.catch((err) => {
			// 				console.log(err);
			// 				// what do we do
			// 			});

			// 		return newModalOpen;
			// 	} else {
			// 		// check compatibility. the subsystem needs to be on + the compatibility needs good also
			// 		if (roverState["rover"]["status"]["systems"][old[index][0]]["status"] != "On") {
			// 			// subsystem is not on, action canceled
			// 			// pop up saying action the service?
			// 			return newModalOpen;
			// 		} else {
			// 			// subsystem is on, check compatibility now
			// 			for (let i = 0; i < NBR_ACTIONS; i++) {
			// 				if (index !== i) {
			// 					if (!newModalOpen[i][1].check(old[index][0])) {
			// 						// not good, compatibility check
			// 						// pop up?
			// 						return newModalOpen;
			// 					}
			// 				}
			// 			}

			// 			// Activation
			// 			actionGoal(old[index][0], true)
			// 				.then((data) => {
			// 					return data.json();
			// 				})
			// 				.then((values) => {
			// 					newModalOpen[index][1].status = true;
			// 				})
			// 				.catch((err) => {
			// 					console.log(err);
			// 					newModalOpen[index][1].status = false;
			// 				});

			// 			return newModalOpen;
			// 		}
			// 	}
			// }
		});
	};

	const triggerDataFocus = (data: string) => {
		setDataFocus((old) => {
			const newFocus = [...old];
			const index = old.indexOf(data);

			if (index === -1) {
				newFocus.push(data);
			} else {
				newFocus.splice(index, 1);
			}

			return newFocus;
		});
	};

	useEffect(() => {
		const handleNext = (event: { key: string }) => {
			if (event.key === "ArrowRight") {
				console.log("Next camera");
				setVideoId((old) => {
					if (old === MAX_CAMERAS - 1) {
						return 0;
					} else {
						return old + 1;
					}
				});
			}
		};
		window.addEventListener("keydown", handleNext);

		return () => {
			window.removeEventListener("keydown", handleNext);
		};
	}, []);

	return (
		<div className={"page " + styles.mainPage}>
			<div className={styles.header}>
				<img src={logo} className={styles.logo} alt="Logo Xplore" />
				<div className={styles.systems}>
					<SystemMode
						system="Navigation"
						currentMode={
							!roverState["rover"]
								? "Off"
								: roverState["rover"]["status"]["systems"]["navigation"]["status"]
						}
						modes={["Auto", "Manual", "Off"]}
						onSelect={(mode) => requestChangeMode("navigation", mode)}
					/>
					<SystemMode
						system="Handling Device"
						currentMode={
							!roverState["rover"]
								? "Off"
								: roverState["rover"]["status"]["systems"]["handling_device"][
										"status"
								  ]
						}
						modes={["Auto", "Manual", "Off"]}
						onSelect={(mode) => requestChangeMode("handling_device", mode)}
					/>
					<SystemMode
						system="Cameras"
						currentMode={
							!roverState["rover"]
								? "Off"
								: roverState["rover"]["status"]["systems"]["cameras"]["status"]
						}
						modes={["Stream", "Off"]}
						onSelect={(mode) => requestChangeMode("cameras", mode)}
					/>
					<SystemMode
						system="Drill"
						currentMode={
							!roverState["rover"]
								? "Off"
								: roverState["rover"]["status"]["systems"]["drill"]["status"]
						}
						modes={["On", "Off"]}
						onSelect={(mode) => requestChangeMode("drill", mode)}
					/>
				</div>
				<Timer end={Date.now() + 10000} size={Size.SMALL} />
			</div>
			<div className={styles.control}>
				<div
					className={styles.data}
					style={{ width: dataOpen ? "18%" : 0, marginLeft: dataOpen ? 20 : 0 }}
				>
					{dataOpen && <h1>Rover Data</h1>}
					{
						// @ts-ignore
						dataOpen && !roverState["rover"] && <p>No data yet</p>
					}
					{
						// @ts-ignore
						dataOpen && roverState["rover"] && (
							<RoverData
								json={roverState}
								triggerDataFocus={triggerDataFocus}
								focusedData={dataFocus}
							/>
						)
					}
				</div>
				<div className={styles.visualization}>
					<div className={styles.expand}>
						<ExpandButton
							onClick={() => setDataOpen((old) => !old)}
							expanded={dataOpen}
						/>
					</div>
					{display === "camera" ? (
						<CameraViewRTC src={videoSrc} rotate={false} setRotateCams={() => {}} />
					) : (
						<Simulation
							armJointAngles={getJointsPositions(roverState)}
							wheelsSpeed={getWheelsSpeed(roverState)}
							wheelsSteeringAngle={getSteeringAngles(roverState)}
							pivotAngle={getPivotAngle(roverState)}
						/>
					)}
					<div className={styles.infos}>
						<div>
							<h3>Current position</h3>
							<div className={styles.infoArrangement}>
								<div style={{ marginRight: "20px" }}>
									<p>X coordinate: 0</p>
									<p>Y coordinate: 0</p>
									<p>Orientation: 0</p>
								</div>
							</div>
						</div>
					</div>
					<div className={styles.previews}>
						<GamepadHint mode="NAV" selectorCallback={() => {}} visible />
						<div
							className={styles.simulation}
							onDoubleClick={(e) => {
								e.stopPropagation();
								setDisplay((old) => (old === "camera" ? "simulation" : "camera"));
							}}
						>
							{display !== "camera" ? (
								<CameraViewRTC
									src={videoSrc}
									rotate={false}
									setRotateCams={() => {}}
								/>
							) : (
								<Simulation
									armJointAngles={getJointsPositions(roverState)}
									wheelsSpeed={getWheelsSpeed(roverState)}
									wheelsSteeringAngle={getSteeringAngles(roverState)}
									pivotAngle={getPivotAngle(roverState)}
								/>
							)}
						</div>
					</div>
					<div className={styles.actions}>
						<QuickAction
							onClick={() => displaySystemModal(0)}
							selected={systemsModalOpen[0][1].status}
							icon={NavIcon}
						/>
						<QuickAction
							onClick={() => displaySystemModal(1)}
							selected={systemsModalOpen[1][1].status}
							icon={HDIcon}
						/>
						<QuickAction
							onClick={() => displaySystemModal(2)}
							selected={systemsModalOpen[2][1].status}
							icon={Drill}
						/>
						<QuickAction
							onClick={() => displaySystemModal(3)}
							selected={systemsModalOpen[3][1].status}
							icon={Stop}
						/>
					</div>
					<NavigationGoalModal />
				</div>
			</div>
		</div>
	);
};

const getJointsPositions = (data: any) => {
	if (!data["handling_device"]) {
		return [];
	}

	const joints = data["handling_device"]["joints"];
	const positions = [];

	for (const joint in joints) {
		positions.push(joints[joint]["angle"]);
	}

	return positions;
};

const getWheelsSpeed = (data: any) => {
	if (!data["navigation"]) {
		return [];
	}

	const wheels = data["navigation"]["wheels"];
	const speeds = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		speeds.push(wheels[wheel]["speed"]);
	}

	return speeds;
};

const getSteeringAngles = (data: any) => {
	if (!data["navigation"]) {
		return [];
	}

	const wheels = data["navigation"]["wheels"];
	const angles = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		angles.push(wheels[wheel]["steering_angle"]);
	}

	return angles;
};

const getPivotAngle = (data: any) => {
	if (!data["navigation"]) {
		return 0;
	}

	return data["navigation"]["wheels"]["pivot"]["angle"];
};
