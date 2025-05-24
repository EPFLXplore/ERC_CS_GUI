import { ReactElement, useEffect, useState } from "react";
import useService from "./serviceHooks";
import useActions, { ActionType } from "./actionsHooks";
import useRoverState from "./roverStateHooks";
import SubSystems from "../data/subsystems.type";
import { PublishTo, PublishToType } from "../data/publishTo.type";
import actionGoal from "../utils/actionGoal";
import States from "../data/states.type";
import { AlertColor } from "@mui/material";
import * as ROSLIB from "roslib";
import requestChangeMode from "../utils/changeSystemMode";
import { Topics } from "../data/topics.type";
import { Sensors } from "../data/sensors.types";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024
Description: Hooks controlling multiple Hooks for the general control of the Rover. The main things are:

1) Its the only place we use useRoverState to have the roverState. 
2) The main functions for ROS are defined here.
*/

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

	// Services ROS
	const [stateServices] = useService(
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
		[SubSystems.SCIENCE]: false,
		["cancel"]: false,
	});

	let resetDustSensorTopic: ROSLIB.Topic<any>;
	let ledCommandsTopic: ROSLIB.Topic<any>;
	let changeSpeedTopic: ROSLIB.Topic<any>;
	let hdResetNodesTopic: ROSLIB.Topic<any>;

	// Navigation
	if(ros) {
		changeSpeedTopic = new ROSLIB.Topic<any>({
			ros: ros,
			name: Topics.CHANGE_SPEED_ROVER,
			messageType: "std_msgs/Float32",
		});
	}

	// Handling Device
	if(ros) {
		hdResetNodesTopic = new ROSLIB.Topic<any>({
			ros: ros,
			name: Topics.HANDLING_DEVICE_RESET_NODES,
			messageType: "std_msgs/Bool",
		})
	}

	const [hdConfirmation, setHDConfirmation] = useState<((confirm: boolean) => void) | null>(null);
	const [hdConfirmationRocks, setHDConfirmationRocks] = useState<((x: number, y: number) => void) | null>(null);
	const [imageRock, setImageRock] = useState<string | null>(null);

	// Science
	if(ros) {
		resetDustSensorTopic = new ROSLIB.Topic<any>({
			ros: ros,
			name: "/test_tt",
			messageType: "std_msgs/Bool",
		})
	}

	// Avionics
	if(ros) {
		ledCommandsTopic = new ROSLIB.Topic<any>({
			ros: ros,
			name: Topics.LED_PUBLISHER,
			messageType: "custom_msg/LEDMessage",
		})
	}

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
	const [manualMode, setManualMode] = useState<PublishToType>(PublishTo.NAVIGATION);

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

			if (stateServices[system].service.state === States.OFF
				
			) {
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
			if (old === PublishTo.NAVIGATION) {
				return PublishTo.HANDLING_DEVICE;
			} else {
				return PublishTo.NAVIGATION;
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

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// NAV CONTROL FUNCTIONS

	const changeSpeedRover = (speed: number) => {
		if(ros) {
			const object = {
				data: speed
			}
			changeSpeedTopic?.publish(object)
		}
	} 

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// HD CONTROL FUNCTIONS

	const resetNodes = () => {
		if(ros) {
			const object = {
				data: true
			}
			hdResetNodesTopic?.publish(object)
		}
	} 

	// Service that triggers Human verification for selecting a Rock on an image

	useEffect(() => {
		if (ros) {
			var res = new ROSLIB.Service({
				ros: ros,
				name: Topics.REQUEST_SELECTION_ROCK,
				serviceType: "custom_msg/srv/RockSelection",
			});

			res.advertiseAsync(async (request: any) => {
				setImageRock("data:image/jpeg;charset=utf-8;base64," + request.rock_image.data)

				const result = await new Promise<{x: number, y: number}>((resolve, reject) => {
					setHDConfirmationRocks(() => (x: number, y: number) => {
						resolve({x, y});
						setHDConfirmationRocks(null);
					});
				});

				return {
					x: result.x,
					y: result.y,
					success: true
				};
			})
		}

	}, [ros]);

	useEffect(() => {
			if (!ros) return;
	
			// The Service object does double duty for both calling and advertising services
			var askUserConfirmation = new ROSLIB.Service({
				ros: ros,
				name: Topics.REQUEST_HUMAIN_VERIFICATION_HD,
				serviceType: "std_srvs/Trigger",
			});
	
			// Use the advertise() method to indicate that we want to provide this service
			askUserConfirmation.advertiseAsync(async (request) => {
				const result = await new Promise<boolean>((resolve, reject) => {
					setHDConfirmation(() => (confirm: boolean) => {
						resolve(confirm)
						setHDConfirmation(null);
					});
				});
				return {
					success: result,
				};
			});
		}, [ros]);

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// SCIENCE CONTROL FUNCTIONS

	const resetSensor = (sensor: Sensors) => {
		if(ros) {
			const object = {
				data: true
			}
			switch (sensor) {
				case Sensors.DUST:
					resetDustSensorTopic?.publish(object)
					break;
			}
		}
	} 

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// AVIONICS CONTROL FUNCTIONS

	const reset_motors = () => {
		if(ros) {
			const object = {
				system: 3,
				mode: 4
			}
			ledCommandsTopic?.publish(object)
		}
	}

	const emergency_shutdown = () => {
		if(ros) {
			const object = {
				system: 3,
				mode: 5
			}
			ledCommandsTopic?.publish(object)
		}
	} 


	return [
		roverState,
		hdConfirmation,
		hdConfirmationRocks,
		imageRock,
		setImageRock,
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
		setModalRosNodes,
		changeSpeedRover,
		resetNodes,
		resetSensor,
		reset_motors,
		emergency_shutdown
	] as const;
};

export default useRoverControls;
