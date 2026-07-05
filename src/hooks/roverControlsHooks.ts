import { ReactElement, useEffect, useMemo, useState } from "react";
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
import { getAvionicsAlive } from "../utils/roverStateParser";

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
		microscope: false,
		suspension: false,
		parameters: false,
		cancel: false,
	});

	const changeSpeedTopic = useMemo(() => ros ? new ROSLIB.Topic<any>({ ros, name: Topics.NAV_CHANGE_SPEED, messageType: "std_msgs/Float32", queue_length: 1, queue_size: 1 }) : null, [ros]);
	const namedJointTargetTopic = useMemo(() => ros ? new ROSLIB.Topic<any>({ ros, name: Topics.HD_NAMED_JOINT_TARGET, messageType: "custom_msg/NamedPose", queue_length: 1, queue_size: 1 }) : null, [ros]);
	const suspensionHeightTopic = useMemo(() => ros ? new ROSLIB.Topic<any>({ ros, name: Topics.ACTIVE_SUSPENSION_HEIGHT, messageType: "std_msgs/Float32", queue_length: 1, queue_size: 1 }) : null, [ros]);

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

	const resetMassDrillTopic = useMemo(() => ros ? new ROSLIB.Topic<any>({ ros, name: Topics.EL_MASS_TARE_DRILL, messageType: "custom_msg/MassRequest", queue_length: 1, queue_size: 1 }) : null, [ros]);
	const resetMassHDTopic = useMemo(() => ros ? new ROSLIB.Topic<any>({ ros, name: Topics.EL_MASS_TARE_HD, messageType: "custom_msg/MassRequest", queue_length: 1, queue_size: 1 }) : null, [ros]);
	const screenshotTopic = useMemo(() => ros ? new ROSLIB.Topic<any>({ ros, name: Topics.SCREENSHOT_ALL_CAMS, messageType: "std_msgs/Bool", queue_length: 1, queue_size: 1 }) : null, [ros]);
	const ledCommandsTopic = useMemo(() => ros ? new ROSLIB.Topic<any>({ ros, name: Topics.EL_LED_COMMANDS, messageType: "custom_msg/LEDRequest", queue_length: 1, queue_size: 1 }) : null, [ros]);

	// When the user clicks on the button to record sensors, it sets the state to true and records the sensors in a csv file
	// using HTTP requests to the backend ExpressJS server
	const [recordSensors, setRecordSensors] = useState(false)

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
	const [dataFocus] = useState<string[]>([]);
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
		const cancellableKeys = Object.keys(stateActions).filter((key) => (
			Object.prototype.hasOwnProperty.call(systemsModalOpen, key) &&
			stateActions[key].ros_object !== null &&
			stateActions[key].goal_object !== undefined
		));

		if (cancellableKeys.length === 0) {
			showSnackbar("info", "No actions are running");
			return;
		}

		setStateActions((old) => {
			const newStates = { ...old };
			cancellableKeys.forEach((key) => {
				newStates[key].ros_object.cancelGoal(newStates[key].goal_object);
				newStates[key].goal_params = null;
				newStates[key].goal_object = undefined;
				newStates[key].action.state = States.OFF;
				newStates[key].ros_object = null;
			});
			return newStates;
		});

		setSystemsModalOpen((old) => ({
			...old,
			...Object.fromEntries(cancellableKeys.map((key) => [key, false])),
		}));
		showSnackbar(
			"success",
			"All actions for have been canceled (correctly we need to check the status on the rover state of the subsystem)"
		);
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

			if (
				system === SubSystems.HANDLING_DEVICE &&
				stateServices[SubSystems.HANDLING_DEVICE].service.state !== States.AUTO
			) {
				showSnackbar(
					"error",
					"Handling Device must be in Auto mode to launch this task"
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

	const setSuspensionHeight = (height: number) => {
		if(!ros) {
			showSnackbar("error", "ROS connection not available");
			return;
		}

		const clampedHeight = Math.max(0, Math.min(100, height));
		suspensionHeightTopic?.publish({
			data: clampedHeight,
		});
		showSnackbar("info", `Suspension height set to ${Math.round(clampedHeight)}%`);
	};

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
		namedJointTargetTopic?.publish({ data: poseName, vel: 1.0 });
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
		if (!ros) return;

		const hdLaunchTopic = new ROSLIB.Topic({
			ros: ros,
			name: Topics.CONFIRMATION_HDS_LAUNCHED,
			messageType: "std_msgs/Bool",
			queue_length: 1,
			queue_size: 1,
		});

		let dialogPending = false;
		hdLaunchTopic.subscribe(() => {
			if (dialogPending) return;
			dialogPending = true;
			setHdStackLaunched(() => (confirm: boolean) => {
				dialogPending = false;
				setHdStackLaunched(null);
			});
		});

		return () => hdLaunchTopic.unsubscribe();
	}, [ros]);

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// SCIENCE CONTROL FUNCTIONS

	const resetSensor = (sensor: Sensors) => {
		if(ros) {
			// load cell ids: HD=0, Drill=1
			switch (sensor) {
				case Sensors.MASS_HD:
					resetMassHDTopic?.publish({ id: 0, tare: true, change_scale: false, scale: 0.0 })
					break

				case Sensors.MASS_DRILL:
					resetMassDrillTopic?.publish({ id: 1, tare: true, change_scale: false, scale: 0.0 })
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

	const updateHdTaskCommand = (mode: 0 | 1 | 2) => {
		if (!ros) {
			showSnackbar("error", "ROS connection not available");
			return;
		}

		const updateCommandService = new ROSLIB.Service({
			ros: ros,
			name: Topics.HD_TASK_UPDATE,
			serviceType: "custom_msg/srv/UpdateTaskRequest",
		});

		updateCommandService.callService(
			{ mode },
			(response: any) => {
				if ((response?.error_type ?? 1) !== 0) {
					showSnackbar("error", response?.error_message || "Failed to update HD task command");
					return;
				}
				showSnackbar("success", response?.error_message || "HD task command sent");
			},
			(error: any) => {
				showSnackbar("error", `ROS service error: ${error}`);
			}
		);
	};

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// AVIONICS CONTROL FUNCTIONS

	const reset_leds = () => {
		if(ros) {
			// systems: NAV=0, HD=1, DRILL=2, AVIONICS=3 -- turn every system's LED off (mode=OFF)
			[0, 1, 2, 3].forEach((system) => {
				ledCommandsTopic?.publish({ system, mode: 0 })
			})
		}
	}

	const reset_motors = () => {
		if(ros) {
			// mode=EMERGENCY_MOTORS is not tied to a specific system
			ledCommandsTopic?.publish({ system: 0, mode: 4 })
		}
	}

	const emergency_shutdown = () => {
		if(ros) {
			// mode=EMERGENCY_SHUTDOWN is not tied to a specific system
			ledCommandsTopic?.publish({ system: 0, mode: 5 })
		}
	}

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// LED SYNC

	// True if any wheel is reporting a steering or driving fault (roverState.navigation.wheels.*).
	// This is the only live NAV fault signal currently published (see getSteeringState/getDrivingState
	// in roverStateParser.ts for the equivalent per-wheel display logic).
	const navHasFault = useMemo(() => {
		const wheels = (roverState as any)?.navigation?.wheels;
		if (!wheels) return false;
		return Object.values(wheels).some((wheel: any) => wheel?.steering_fault || wheel?.driving_fault);
	}, [roverState]);

	// NAV: FAULT takes priority over mode display. AUTO -> BLINK, ACKERMANN/OMNI -> ON, OFF -> OFF.
	// Republished periodically (not just once) in case the avionics node wasn't subscribed yet when
	// the first message went out over rosbridge.
	useEffect(() => {
		const navState = stateServices[SubSystems.NAGIVATION].service.state;

		let mode: number | null = null;
		if (navHasFault) {
			mode = 3; // FAULT
		} else if (navState === States.AUTO) {
			mode = 2; // BLINK
		} else if (navState === States.ACKERMANN || navState === States.OMNI_DIRECTIONAL) {
			mode = 1; // ON
		} else if (navState === States.OFF) {
			mode = 0; // OFF
		}

		if (mode === null) return;

		ledCommandsTopic?.publish({ system: 0, mode })
		const interval = setInterval(() => {
			ledCommandsTopic?.publish({ system: 0, mode })
		}, 2000)

		return () => clearInterval(interval)
	}, [stateServices[SubSystems.NAGIVATION].service.state, navHasFault, ledCommandsTopic])

	// HD: AUTO -> BLINK. (HD FAULT isn't wired yet -- the interface no longer publishes a
	// per-joint fault/mode_motor signal to key off of.)
	useEffect(() => {
		if (stateServices[SubSystems.HANDLING_DEVICE].service.state !== States.AUTO) {
			return;
		}

		ledCommandsTopic?.publish({ system: 1, mode: 2 })
		const interval = setInterval(() => {
			ledCommandsTopic?.publish({ system: 1, mode: 2 })
		}, 2000)

		return () => clearInterval(interval)
	}, [stateServices[SubSystems.HANDLING_DEVICE].service.state, ledCommandsTopic])

	// DRILL: ON -> ON. (DRILL only has ON/OFF modes, no AUTO-equivalent to BLINK on; DRILL FAULT
	// isn't wired yet -- no confirmed fault signal to key off of.)
	useEffect(() => {
		if (stateServices[SubSystems.DRILL].service.state !== States.ON) {
			return;
		}

		ledCommandsTopic?.publish({ system: 2, mode: 1 })
		const interval = setInterval(() => {
			ledCommandsTopic?.publish({ system: 2, mode: 1 })
		}, 2000)

		return () => clearInterval(interval)
	}, [stateServices[SubSystems.DRILL].service.state, ledCommandsTopic])

	// AVIONICS: alive (heartbeat counter changing, see roverStateHooks) -> ON.
	const avionicsAlive = getAvionicsAlive(roverState);
	useEffect(() => {
		if (!avionicsAlive) {
			return;
		}

		ledCommandsTopic?.publish({ system: 3, mode: 1 })
		const interval = setInterval(() => {
			ledCommandsTopic?.publish({ system: 3, mode: 1 })
		}, 2000)

		return () => clearInterval(interval)
	}, [avionicsAlive, ledCommandsTopic])


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
		screenshotAllCameras,
		setSuspensionHeight,
		updateHdTaskCommand
	] as const;
};

export default useRoverControls;
