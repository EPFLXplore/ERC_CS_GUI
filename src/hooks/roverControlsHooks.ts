import { ReactElement, useEffect, useState } from "react";
import useService from "./serviceHooks";
import useActions, { ActionType } from "./actionsHooks";
import useRoverState from "./roverStateHooks";
import useNewCamera from "./newCameraHooks";
import SubSystems from "../data/subsystems.type";
import { Task } from "../data/tasks.type";
import actionGoal from "../utils/actionGoal";
import States from "../data/states.type";
import { AlertColor } from "@mui/material";
import * as ROSLIB from "roslib";
import requestChangeMode from "../utils/changeSystemMode";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024
Description: Hooks controlling multiple Hooks for the general control of the Rover. The main things are:

1) Its the only place we use useRoverState to have the roverState. 
2) The main functions for ROS are defined here.
*/

const MAX_CAMERAS = 5;

type typeModal = {
	[key: string]: boolean;
};

export type { typeModal };

const useRoverControls = (
	ros: ROSLIB.Ros | null,
	showSnackbar: (sev: AlertColor, mes: string) => void
) => {

	// RoverState
	const [roverState] = useRoverState(ros);

	// Cameras
	const [cameraStates, images, rotateCams, currentVideo, setCurrentVideo] = useNewCamera(ros, roverState);
	const [dataOpen, setDataOpen] = useState(false);
	const [display, setDisplay] = useState("camera");

	// Services ROS
	const [stateServices, ] = useService(
		roverState,
		(sev, mess) => showSnackbar(sev, mess)
	);

	// Actions ROS
	const [stateActions, setStateActions] = useActions(roverState)

	// Panels of Control for Actions. Which one is open on the control page
	const [modal, setModal] = useState<ReactElement | null>(null);
	const [systemsModalOpen, setSystemsModalOpen] = useState<typeModal>({
		[SubSystems.CAMERA]: false,
		[SubSystems.NAGIVATION]: false,
		[SubSystems.HANDLING_DEVICE]: false,
		[SubSystems.DRILL]: false,
		["cancel"]: false,
	});

	// Panels of Control for ROS nodes. Which one is open on the control page
	const [modalRosNodes, setModalRosNodes] = useState<ReactElement | null>(null);
	const [rosModalOpen, setRosModalOpen] = useState<typeModal>({
		[SubSystems.ROVER]: false,
		[SubSystems.NAGIVATION]: false,
		[SubSystems.HANDLING_DEVICE]: false,
		[SubSystems.DRILL]: false,
		[SubSystems.EL]: false,
	});

	// Gamepad
	const [manualMode, setManualMode] = useState(Task.NAVIGATION);

	// Simulation
	const [dataFocus, setDataFocus] = useState<string[]>([]);
	const [point, setPoint] = useState({ x: -10, y: -10 });
	const [volumetric, setVolumetric] = useState(false);

	// ------------------------------------------------------------------------------------
	// Methods
	// ------------------------------------------------------------------------------------

	// Cancel an action for a subsystem. If no action is running, it does nothing
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
				(actions: ActionType) => setStateActions(actions),
				showSnackbar,
				systemsModalOpen
			);

			return newStates;
		});
	};

	// Cancel all actions. If no actions are running, it does nothing.
	const cancelAllActions = () => {
		let canceled = false
		for (const key in stateActions) {
			if (systemsModalOpen.hasOwnProperty(key)) {
				setStateActions((old) => {
					let newStates = { ...old };

					if (
						newStates[key].ros_object !== null &&
						newStates[key].goal_object !== undefined
					) {
						newStates[key].ros_object.cancelGoal(newStates[key].goal_object);

						// can't check if the cancelation is successful it's not a future!

						newStates[key].goal_params = null;
						newStates[key].goal_object = undefined;
						newStates[key].action.state = States.OFF;
						newStates[key].ros_object = null;
						canceled = true
						showSnackbar(
							"success",
							"All actions for have been canceled (correctly we need to check the status on the rover state of the subsystem)"
						);
					}
					return newStates;
				});
				// @ts-ignore
				systemsModalOpen[key] = false;
			}
		}

		if(!canceled) {
			showSnackbar(
				"info",
				"No actions are running"
			);
		}
	};

	// Launch an action for a subsystem with the arguments for ROS. If the system is not enabled, 
	// it shows a snack bar. If an action is already running it's similar.
	const launchAction = (system: string, actionArgs: Object) => {
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
				(actions: ActionType) => setStateActions(actions),
				showSnackbar,
				actionArgs
			);
			return newStates;
		});
	};

	// Launch a service for either a subystem, or the cameras. If isCamera is true, thenb it is used
	// to activate or deactivate a camera (with the activatedCamera boolean)
	const startService = async (system: string, mode: string, isCamera: boolean, activatedCamera: boolean = false) => {
		
		if(!isCamera) {

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
		}

		let request_object;
		if(isCamera) {
			request_object = {
				subsystem: system,
				index: mode,
				activate: activatedCamera
			}

			requestChangeMode(
				ros,
				true,
				request_object,
				(sev, mes) => showSnackbar(sev, mes)
			);
		} else {
			request_object = {
				system: system,
				mode: mode
			}

			if(stateActions[system].goal_object != null) {
				showSnackbar('error', 'An action is running, you cant switch the mode')
				return
			}

			requestChangeMode(
				ros,
				false,
				request_object,
				(sev, mes) => showSnackbar(sev, mes)
			);
		}
	};

	// Change the mode of the gamepad publisher.
	const changeMode = () => {
		setManualMode((old) => {
			if (old === Task.NAVIGATION) {
				return Task.HANDLING_DEVICE;
			} else {
				return Task.NAVIGATION;
			}
		});
	};

	// ?
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

	// Change the camera on the screen
	useEffect(() => {
		const handleNext = (event: { key: string }) => {
			if (event.key === "ArrowRight") {
				console.log("Next camera");
				setCurrentVideo((old) => {
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

	return [
		roverState,
		cameraStates,
		images,
		rotateCams,
		currentVideo,
		setCurrentVideo,
		dataOpen,
		setDataOpen,
		display,
		setDisplay,
		stateServices,
		stateActions,
		setStateActions,
		systemsModalOpen,
		setSystemsModalOpen,
		manualMode,
		modal,
		volumetric,
		setModal,
		dataFocus,
		cancelAction,
		cancelAllActions,
		launchAction,
		startService,
		changeMode,
		triggerDataFocus,
		point,
		setPoint,
		setVolumetric,
		rosModalOpen,
		setRosModalOpen,
		modalRosNodes,
		setModalRosNodes
	] as const;
};

export default useRoverControls;
