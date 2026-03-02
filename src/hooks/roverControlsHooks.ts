import { ReactElement, startTransition, useEffect, useState } from "react";
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
import { BrokenImageSharp } from "@mui/icons-material";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024-25
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

	let resetMassDrillTopic: ROSLIB.Topic<any>;
	let resetMassHDTopic: ROSLIB.Topic<any>;
	let ledCommandsTopic: ROSLIB.Topic<any>;
	let screenshotTopic: ROSLIB.Topic<any>;
	let changeSpeedTopic: ROSLIB.Topic<any>;
	let namedJointTargetTopic: ROSLIB.Topic<any>;

	// Navigation - Direct to NAV subsystem
	if(ros) {
		changeSpeedTopic = new ROSLIB.Topic<any>({
			ros: ros,
			name: Topics.NAV_CHANGE_SPEED,  // Direct to NAV subsystem
			messageType: "std_msgs/Float32",
		});
	}

	// HD - Named joint target for predefined poses (direct to kinematics planner)
	if(ros) {
		namedJointTargetTopic = new ROSLIB.Topic<any>({
			ros: ros,
			name: Topics.HD_NAMED_JOINT_TARGET,
			messageType: "std_msgs/String",
		});
	}

	// HDS can send a requet to confirm something (continue a task for example)
	// It can also send some string information, like a qr code value. The term qrCode is not write
	// but its the only information that we send to the CS, but please rename it if you want.
	const [hdConfirmation, setHDConfirmation] = useState<((confirm: boolean) => void) | null>(null);
	const [qrCode, setQrCode] = useState<string | null>(null);

	// HDS sends a request to select elements on an image.
	// The numberElementToSelect is also part of the request service RockSelection.srv and sets the number of click on the image
	// to continue the process..
	const [hdConfirmationSelectElements, setHDConfirmationSelectElements] = useState<((x: number[], y: number[]) => void) | null>(null);
	const [numberElementToSelect, setNumberElementToSelect] = useState<number>(0);
	const [imageToSelect, setImageToSelect] = useState<string | null>(null);

	// PLease remove the displayGif after the ERC 2025, it was a joke for the competition
	// It is used to display a gif when the user scans a QRCODE on an image.
	const [displayGif, setDisplayGif] = useState<boolean | null>(null);

	// Confirmation when the HDS stack is launched.
	const [hdStackLaunched, setHdStackLaunched] = useState<((confirm: boolean) => void) | null>(null);

	// Science - Direct to EL (Electronics) subsystem for sensors
	if(ros) {
		resetMassDrillTopic = new ROSLIB.Topic<any>({
			ros: ros,
			name: Topics.EL_MASS_TARE_DRILL,  // Direct to EL subsystem
			messageType: "custom_msg/MassRequestDrill",
		})

		resetMassHDTopic = new ROSLIB.Topic<any>({
			ros: ros,
			name: Topics.EL_MASS_TARE_HD,  // Direct to EL subsystem
			messageType: "custom_msg/MassRequestHD",
		})

		// Screenshot - which subsystem manages cameras? Using NAV for now
		screenshotTopic = new ROSLIB.Topic<any>({
			ros: ros,
			name: Topics.SCREENSHOT_ALL_CAMS,  // Or separate camera manager?
			messageType: "std_msgs/Bool",
		})
	}

	// When the user clicks on the button to record sensors, it sets the state to true and records the sensors in a csv file
	// using HTTP requests to the backend ExpressJS server
	const [recordSensors, setRecordSensors] = useState(false)

	// Avionics - Direct to EL (Electronics) subsystem
	if(ros) {
		ledCommandsTopic = new ROSLIB.Topic<any>({
			ros: ros,
			name: Topics.EL_LED_COMMANDS,  // Direct to EL subsystem
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

	// Simulation, not really used right now.
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

	// Launch a service for either a subystem, or the cameras. If isCamera is true, then it is used
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

	// Select the submode of subsystem
	const selectSubMode = () => {
		if(stateServices[SubSystems.NAGIVATION].service.state === States.ACKERMANN || stateServices[SubSystems.NAGIVATION].service.state === States.OMNI_DIRECTIONAL) {
			return stateServices[SubSystems.NAGIVATION].service.state
		} else if (stateServices[SubSystems.HANDLING_DEVICE].service.state === States.MANUAL_DIRECT || stateServices[SubSystems.HANDLING_DEVICE].service.state === States.MANUAL_INVERSE) {
			return stateServices[SubSystems.HANDLING_DEVICE].service.state
		} else {
			return States.ACKERMANN
		}
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

	// Publish a predefined named pose directly to the kinematics planner.
	// HD must be in Auto mode for the planner to process it.
	const sendHdNamedPose = (poseName: string) => {
		if (!ros) {
			showSnackbar("error", "ROS connection not available");
			return;
		}
		if (stateServices[SubSystems.HANDLING_DEVICE].service.state !== States.AUTO) {
			showSnackbar("error", "HD must be in Auto mode to send a predefined pose");
			return;
		}
		namedJointTargetTopic?.publish({ data: poseName });
		showSnackbar("info", `Sending HD to: ${poseName}`);
	};

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// HD CONTROL FUNCTIONS

	// Service that triggers Human verification for selecting a something on an image that needs to be collected
	// The name with rocks it not right, please rename it at some point.
	useEffect(() => {
		if (ros) {
			var res = new ROSLIB.Service({
				ros: ros,
				name: Topics.REQUEST_SELECTION_IMAGE,
				serviceType: "custom_msg/srv/ControlStationSelection",
			});

			res.advertiseAsync(async (request: any) => {
				setImageToSelect("data:image/jpeg;charset=utf-8;base64," + request.image.data)

				setNumberElementToSelect(request.number_element_to_select);

				const result = await new Promise<{x: number[], y: number[]}>((resolve, reject) => {
					setHDConfirmationSelectElements(() => (x: number[], y: number[]) => {
						resolve({x, y});
						setHDConfirmationSelectElements(null);
						setNumberElementToSelect(0);
						setImageToSelect(null);
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
				serviceType: "custom_msg/srv/HumanVerification",
			});
	
			// Use the advertise() method to indicate that we want to provide this service
			askUserConfirmation.advertiseAsync(async (request) => {
				//@ts-ignore
				const information = request.information
				setQrCode(information)

				// TODO REMOVE ME AFTER ERC 2025, IT WAS FOR A JOKE IN THE COMPETITION
				if(information === "A" || information === "B" || information === "C"
					|| information === "D" || information === "E" || information === "F"
				) {
					setDisplayGif(true);
				}

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

	useEffect(() => {
		if (ros) {
			const hdStackLaunched = new ROSLIB.Topic({
				ros: ros,
				name: Topics.CONFIRMATION_HDS_LAUNCHED,
				messageType: "std_msgs/Bool",
			});

			hdStackLaunched.subscribe(async (message) => {
				const result = await new Promise<boolean>((resolve, reject) => {
					setHdStackLaunched(() => (confirm: boolean) => {
						resolve(confirm)
						setHdStackLaunched(null);
					});
				});
			});
		}
		}, [ros]);

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// SCIENCE CONTROL FUNCTIONS

	const resetSensor = (sensor: Sensors) => {
		if(ros) {
			const object = {
				tare: true,
				scale: 0.0
			}
			switch (sensor) {
				case Sensors.MASS_HD:
					resetMassHDTopic?.publish(object)
					break

				case Sensors.MASS_DRILL:
					resetMassDrillTopic?.publish(object)
					break

				default:
					break
			}
		}
	} 

	const screenshotAllCameras = () => {
		if(ros) {
			const object = {
				data: true
			}
			screenshotTopic?.publish(object);
		}
	}

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// AVIONICS CONTROL FUNCTIONS

	const reset_leds = () => {
		if(ros) {
			const object = {
				state: 6
			}
			ledCommandsTopic?.publish(object)
		}
	}

	const reset_motors = () => {
		if(ros) {
			const object = {
				state: 4
			}
			ledCommandsTopic?.publish(object)
		}
	}

	const emergency_shutdown = () => {
		if(ros) {
			const object = {
				state: 5
			}
			ledCommandsTopic?.publish(object)
		}
	} 


	return [
		roverState,
		qrCode,
		setQrCode,
		hdStackLaunched,
		hdConfirmation,
		hdConfirmationSelectElements,
		numberElementToSelect,
		imageToSelect,
		setImageToSelect,
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
		selectSubMode,
		point,
		setPoint,
		setVolumetric,
		rosModalOpen,
		setRosModalOpen,
		modalRosNodes,
		setModalRosNodes,
		changeSpeedRover,
		resetSensor,
		reset_leds,
		reset_motors,
		emergency_shutdown,
		recordSensors, 
		setRecordSensors,
		displayGif,
		setDisplayGif,
		sendHdNamedPose,
		screenshotAllCameras
	] as const;
};

export default useRoverControls;
