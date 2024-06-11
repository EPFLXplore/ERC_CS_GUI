// @ts-nocheck
import { ReactElement, useEffect, useState } from "react";
import styles from "./style.module.sass";
import { Size } from "../../utils/size.type";
import Timer from "../../components/Timer";
import ExpandButton from "../../components/ExpandButton";
import Gamepad from "../../components/Gamepad";
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
import CameraView from "../../components/CameraView";
import cancelAllActions from "../../utils/cancelAllActions";
import actionGoal from "../../utils/actionGoal";
import useRosBridge from "../../hooks/rosbridgeHooks";
import useNewCamera from "../../hooks/newCameraHooks";
import useService from "../../hooks/serviceHooks";
import useActions from "../../hooks/actionDrillHooks";

export default () => {
	const MAX_CAMERAS = 2;
	const NBR_ACTIONS = 3;
	const NBR_SERVICES = 4;

	const [dataOpen, setDataOpen] = useState(false);
	const [display, setDisplay] = useState("camera");
	const [ros] = useRosBridge();
	const [roverState] = useRoverState(ros);
	const [stateServices, setStateServices] = useService(roverState, NBR_SERVICES)
	const [stateActions, setStateActions] = useActions(roverState, NBR_ACTIONS, stateServices)
	const [sentService, setSendService] = useState(false)

	const [systemsModalOpen, setSystemsModalOpen] = useState([false, false, false, false]);

	const [modal, setModal] = useState<ReactElement | null>(<></>);
	// const [videoSrc, videoId, setVideoId] = useConnectWebRTC();
	const [images, rotateCams] = useNewCamera(ros);

	const [dataFocus, setDataFocus] = useState<string[]>([]);

	const cancelAction = async (index: number) => {
		setStateActions((old) => {
			newStates = [...old];

			actionGoal(old[index].name, false)
				.then((data) => {
					return data.json();
				})
				.then((values) => {
					if (values["status"] == false) {
						stateActions[index].action.status = false;
					} else {
						// error the action has not been canceled!
					}
				})
				.catch((err) => {
					console.log(err);
				});
		});
	};

	const launchAction = async (index: number, ...args: any[]) => {
		setStateActions((old) => {
			newStates = [...old];

			if (newStates[index].action.status) {
				// print something since an action is running
				return newStates;
			} else {
				if (roverState["rover"]["status"]["systems"][old[index].name]["status"] != "On") {
					// print something since we need to put on the service
					return newStates;
				} else {
					for (let i = 0; i < NBR_ACTIONS; i++) {
						if (index !== i) {
							if (!newModalOpen[i][1].check(old[index][0])) {
								// not good, compatibility check
								// pop up something also
								return newStates;
							}
						}
					}

					actionGoal(stateActions[index][0], true, args)
						.then((data) => {
							return data.json();
						})
						.then((values) => {
							// print something like action successfully done
						})
						.catch((err) => {
							console.log(err);
						});
				}
			}
		})
	}

	const startService = async (index: number, mode: string) => {
		for (let i = 0; i < NBR_SERVICES; i++) {
			if(index !== i) {
				if(!stateServices[index].service.canChange(stateServices[i], mode)) {
					console.log(i)
					// not good, compatibility check
					// pop up something also
					console.log("compatibility not good to activate this service")
					return;
				}
			}
		}

		requestChangeMode(ros, stateServices[index].name, mode)
	}

	const displaySystemModal = (index: number) => {
		setSystemsModalOpen((old) => {
			const newModalOpen = [...old];

			if (index == NBR_ACTIONS) {
				cancelAllActions()
					.then((data) => data.json())
					.then((values) => {
						for (let i = 0; i < NBR_ACTIONS; i++) {
							if (values["status"][i] == false) {
								newModalOpen[i] = false;
							} else {
								// should throw a pop up danger an action is on!!
							}
						}
					})
					.catch((err) => {
						console.log(err);
					});

				return newModalOpen;
			} else {
				newModalOpen[index] = !old[index];
				return newModalOpen;
			}
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
						onSelect={(mode) => startService(0, mode)}
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
						onSelect={(mode) => startService(1, mode)}
					/>
					<SystemMode
						system="Cameras"
						currentMode={
							!roverState["rover"]
								? "Off"
								: roverState["rover"]["status"]["systems"]["cameras"]["status"]
						}
						modes={["Stream", "Off"]}
						onSelect={(mode) => startService(2, mode)}
					/>
					<SystemMode
						system="Drill"
						currentMode={
							!roverState["rover"]
								? "Off"
								: roverState["rover"]["status"]["systems"]["drill"]["status"]
						}
						modes={["On", "Off"]}
						onSelect={(mode) => startService(3, mode)}
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
						<CameraView images={images} rotate={rotateCams} setRotateCams={() => {}} />
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
						<Gamepad mode="NAV" selectorCallback={() => {}} visible />
						<div
							className={styles.simulation}
							onDoubleClick={(e) => {
								e.stopPropagation();
								setDisplay((old) => (old === "camera" ? "simulation" : "camera"));
							}}
						>
							{display !== "camera" ? (
								<CameraView
									images={images}
									rotate={rotateCams}
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
							selected={stateActions[0].running}
							icon={NavIcon}
						/>
						<QuickAction
							onClick={() => displaySystemModal(1)}
							selected={stateActions[1].running}
							icon={HDIcon}
						/>
						<QuickAction
							onClick={() => displaySystemModal(2)}
							selected={stateActions[2].running}
							icon={Drill}
						/>
						<QuickAction
							onClick={() => displaySystemModal(NBR_ACTIONS)}
							selected={false}
							icon={Stop}
						/>
					</div>
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
