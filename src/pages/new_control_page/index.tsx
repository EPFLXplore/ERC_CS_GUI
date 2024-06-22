// @ts-nocheck
import { ReactElement, useEffect, useState, SyntheticEvent } from "react";
import styles from "./style.module.sass";
import { Size } from "../../utils/size.type";
import Timer from "../../components/Timer";
import ExpandButton from "../../components/ExpandButton";
import Gamepad from "../../components/Gamepad";
import QuickAction from "../../components/QuickAction";
import { Task } from "../../utils/tasks.type";

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
import useActions, { ActionType } from "../../hooks/actionsHooks";
import NavigationGoalModal from "../../components/NavigationGoalModal";

import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import SubSystems from "../../utils/SubSystems";
import States from "../../utils/States";

export default () => {
	const MAX_CAMERAS = 2;
	const NBR_ACTIONS = 3;
	const NBR_SERVICES = 4;

	const [dataOpen, setDataOpen] = useState(false);
	const [display, setDisplay] = useState("camera");
	const [ros] = useRosBridge();
	const [roverState] = useRoverState(ros);

	const [snackbar, setSnackbar] = useState<State>({
		open: false,
		severity: "error",
		message: "This is a snackbar",
	});
	const { severity, message, open } = snackbar;

	// Show a snackbar with a message and a severity
	// Severity can be "error", "warning", "info" or "success"
	const showSnackbar = (severity: string, message: string) => {
		setSnackbar({ severity, message, open: true });
	};

	const handleClose = (event?: SyntheticEvent | Event, reason?: string) => {
		if (reason === "clickaway") {
			return;
		}

		setSnackbar({ ...snackbar, open: false });
	};

	const [sentService, setSendService] = useState(false);
	const [stateServices, setStateServices] = useService(
		roverState,
		NBR_SERVICES,
		sentService,
		(sev, mess) => showSnackbar(sev, mess)
	);

	const [sentAction, setSendAction] = useState(false);
	const [stateActions, setStateActions] = useActions(roverState, sentAction, (sev, mes) =>
		showSnackbar(sev, mes)
	);

	const [systemsModalOpen, setSystemsModalOpen] = useState({
		[SubSystems.NAGIVATION]: false,
		[SubSystems.HANDLING_DEVICE]: false,
		[SubSystems.DRILL]: false,
		["cancel"]: false,
	});
	const [manualMode, setManualMode] = useState(Task.NAVIGATION);

	const [modal, setModal] = useState<ReactElement | null>(<></>);
	const [images, rotateCams] = useNewCamera(ros);

	const [dataFocus, setDataFocus] = useState<string[]>([]);

	const cancelAction = (system: string) => {
		setStateActions((old) => {
			let newStates = { ...old };

			if (newStates[system].action.state === States.OFF) {
				showSnackbar("error", "No action is running for the system " + system);
				return newStates;
			}

			actionGoal(
				ros,
				system,
				false,
				newStates[system].action,
				(b) => setSendAction(b),
				(actions: ActionType) => setStateActions(actions)
			);

			return newStates;
		});
	};

	const launchAction = (system: string, ...args: any[]) => {
		setStateActions((old) => {
			let newStates = { ...old };

			if (stateServices[system].service.state === States.OFF) {
				// the system is not ON
				showSnackbar(
					"error",
					"The system " +
						stateServices[system].service.name +
						" needs to be on to start an action"
				);
				return newStates;
			}

			if (newStates[system].action.state !== States.OFF) {
				showSnackbar("error", "An action is already running for the system " + system);
				return newStates;
			}
			actionGoal(
				ros,
				system,
				true,
				newStates[system].action,
				(b) => setSendAction(b),
				(actions: ActionType) => setStateActions(actions),
				args
			);
			return newStates;
		});
	};

	const startService = async (system: string, mode: string) => {
		for (const key in stateServices) {
			if (stateServices.hasOwnProperty(key)) {
				if (key !== system) {
					let service = stateServices[key];
					if (!stateServices[system].service.canChange(service.service, mode)) {
						showSnackbar(
							"error",
							"To put " +
								stateServices[system].service.name +
								" in mode " +
								mode +
								", you need to change the service " +
								service.service.name
						);
						return;
					}
				}
			}
		}

		requestChangeMode(
			ros,
			stateServices[system].service.name,
			mode,
			stateServices[system].service,
			(b) => setSendService(b),
			(sev, mes) => showSnackbar(sev, mes)
		);
	};

	const displaySystemModal = (system: string, cancel: boolean) => {
		setSystemsModalOpen((old) => {
			let newModalOpen = { ...old };

			if (cancel) {
				for (const key in newModalOpen) {
					if (newModalOpen.hasOwnProperty(key) && key !== "cancel") {
						// closing all modals
						setStateActions((old) => {
							let newStates = { ...old };
							if (newStates[key].ros_goal !== null) {
								newStates[key].ros_goal?.cancel();
								newStates[key].action.state = States.OFF;
							}
							return newStates;
						});
						newModalOpen[key] = false;
					}

					// TODO check here the rover state to be sure that actions are at OFF? and shw bar if not
					showSnackbar("error", "An error occurred while cancelling the actions");
				}

				return newModalOpen;
			} else {
				newModalOpen[system] = true;
				setModal(selectModal(system));

				return newModalOpen;
			}
		});
	};

	const selectModal = (system: string) => {
		switch (system) {
			case SubSystems.NAGIVATION:
				return (
					<NavigationGoalModal
						onClose={() => {
							setModal(<></>);
							setSystemsModalOpen((old) => {
								const newModalOpen = { ...old };
								newModalOpen[SubSystems.NAGIVATION] = false;
								return newModalOpen;
							});
						}}
						onSetGoal={(system, args) => {
							launchAction(system, args);
						}}
						onCancelGoal={(system) => {
							cancelAction(system);
						}}
					/>
				);
			case SubSystems.HANDLING_DEVICE:
				return (
					<NavigationGoalModal
						onClose={() => {
							setModal(<></>);
							setSystemsModalOpen((old) => {
								const newModalOpen = { ...old };
								newModalOpen[SubSystems.HANDLING_DEVICE] = false;
								return newModalOpen;
							});
						}}
						onSetGoal={(system, args) => {
							launchAction(system, args);
						}}
						onCancelGoal={(system) => {
							cancelAction(system);
						}}
					/>
				);
			case SubSystems.DRILL:
				return (
					<NavigationGoalModal
						onClose={() => {
							setModal(<></>);
							setSystemsModalOpen((old) => {
								const newModalOpen = { ...old };
								newModalOpen[SubSystems.DRILL] = false;
								return newModalOpen;
							});
						}}
						onSetGoal={(system, args) => {
							launchAction(system, args);
						}}
						onCancelGoal={(system) => {
							cancelAction(system);
						}}
					/>
				);
			default:
				return <></>;
		}
	};

	const changeMode = () => {
		setManualMode((old) => {
			if (old === Task.NAVIGATION) {
				return Task.HANDLING_DEVICE;
			} else {
				return Task.NAVIGATION;
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
						currentMode={stateServices[SubSystems.NAGIVATION].service.state}
						modes={["Auto", "Manual", "Off"]}
						onSelect={(mode) => startService(SubSystems.NAGIVATION, mode)}
					/>
					<SystemMode
						system="Handling Device"
						currentMode={stateServices[SubSystems.HANDLING_DEVICE].service.state}
						modes={["Auto", "Manual", "Off"]}
						onSelect={(mode) => startService(SubSystems.HANDLING_DEVICE, mode)}
					/>
					<SystemMode
						system="Cameras"
						currentMode={stateServices[SubSystems.CAMERA].service.state}
						modes={["Stream", "Off"]}
						onSelect={(mode) => startService(SubSystems.CAMERA, mode)}
					/>
					<SystemMode
						system="Drill"
						currentMode={stateServices[SubSystems.DRILL].service.state}
						modes={["On", "Off"]}
						onSelect={(mode) => startService(SubSystems.DRILL, mode)}
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
						<Gamepad
							mode={manualMode}
							selectorCallback={changeMode}
							visible={
								stateServices[SubSystems.NAGIVATION].service.state ===
									States.MANUAL ||
								stateServices[SubSystems.HANDLING_DEVICE].service.state ===
									States.MANUAL
							}
							ros={ros}
						/>
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
							onClick={() => displaySystemModal(SubSystems.NAGIVATION, false)}
							selected={systemsModalOpen[SubSystems.NAGIVATION]}
							running={stateActions[SubSystems.NAGIVATION].action.state}
							icon={NavIcon}
						/>
						<QuickAction
							onClick={() => displaySystemModal(SubSystems.HANDLING_DEVICE, false)}
							selected={systemsModalOpen[SubSystems.HANDLING_DEVICE]}
							running={stateActions[SubSystems.HANDLING_DEVICE].action.state}
							icon={HDIcon}
						/>
						<QuickAction
							onClick={() => displaySystemModal(SubSystems.DRILL, false)}
							selected={systemsModalOpen[SubSystems.DRILL]}
							running={stateActions[SubSystems.DRILL].action.state}
							icon={Drill}
						/>
						<QuickAction
							onClick={() => displaySystemModal(null, true)}
							selected={false}
							icon={Stop}
						/>
					</div>
					{modal}
					<Snackbar
						open={open}
						autoHideDuration={4000}
						onClose={handleClose}
						anchorOrigin={{ vertical: "top", horizontal: "center" }}
						sx={{ position: "absolute" }}
					>
						<Alert
							onClose={handleClose}
							severity={severity}
							variant="filled"
							sx={{ width: "100%", whiteSpace: "pre-line", borderRadius: 3 }}
						>
							{message}
						</Alert>
					</Snackbar>
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
