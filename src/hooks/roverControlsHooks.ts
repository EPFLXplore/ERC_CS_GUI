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
import useOperatorRole from "./operatorRoleHooks";
import { ConfirmationHd } from "../data/confirmationHd.type";

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

type ImageSelectionResult = {
	x: number[];
	y: number[];
	success: boolean;
};

/**
 * rosbridge `subscribe` QoS (see ROSBRIDGE_PROTOCOL.md §4.2). roslib's Topic omits `qos`, so
 * without this the bridge falls back to its best-effort/volatile default (fine for camera feeds,
 * not for one-shot confirmations that must not be silently dropped). This mirrors ROS 2's
 * rmw_qos_profile_services_default.
 */
const HDS_CONFIRMATION_SUBSCRIBE_QOS = {
	history: "keep_last",
	depth: 10,
	reliability: "reliable",
	durability: "volatile",
} as const;

/**
 * Shown on screen while a confirmation is pending. The `beforeunload` dialog cannot carry it —
 * browsers have ignored custom text there since 2016 and show their own wording — so this is the
 * only place the operator actually reads it.
 */
export const HDS_REFRESH_WARNING = "Warning dont refresh if HDS confirmation is pending";

const HD_STACK_ACK_STORAGE_KEY = "erc-cs-hd-stack-ack-pending-v1";

function readHdStackAckPending(): boolean {
	try {
		return window.localStorage.getItem(HD_STACK_ACK_STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}

function writeHdStackAckPending(pending: boolean): void {
	try {
		if (pending) {
			window.localStorage.setItem(HD_STACK_ACK_STORAGE_KEY, "1");
		} else {
			window.localStorage.removeItem(HD_STACK_ACK_STORAGE_KEY);
		}
	} catch {
		// Private-mode / quota failures must not break the prompt itself.
	}
}

function patchTopicRosbridgeQoS(topic: ROSLIB.Topic<any>, qos: Record<string, unknown>): void {
	const t = topic as ROSLIB.Topic<any> & {
		callForSubscribeAndAdvertise: (msg: Record<string, unknown>) => void;
	};
	const original = t.callForSubscribeAndAdvertise.bind(topic);
	t.callForSubscribeAndAdvertise = (msg: Record<string, unknown>) => {
		if (msg.op === "subscribe") {
			msg.qos = { ...qos };
		}
		original(msg);
	};
}

const useRoverControls = (
	ros: ROSLIB.Ros | null,
	showSnackbar: (sev: AlertColor, mes: string) => void
) => {

	// Only the browser running on the NUC handles HD confirmations. Extra viewers of the page must
	// not get blocking overlays (the reflex is to refresh, which drops their rosbridge socket and
	// the HD camera stream), and must not advertise a second copy of the confirmation services.
	const { isOperator, status: operatorRoleStatus } = useOperatorRole();

	// RoverState
	const [roverState, stateTopicDiagnostics] = useRoverState(ros);

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
		suspension: false,
		avionics: false,
		parameters: false,
		cancel: false,
	});

	const changeSpeedTopic = useMemo(() => ros ? new ROSLIB.Topic<any>({ ros, name: Topics.NAV_CHANGE_SPEED, messageType: "std_msgs/Float32", queue_length: 1, queue_size: 1 }) : null, [ros]);
	const namedJointTargetTopic = useMemo(() => ros ? new ROSLIB.Topic<any>({ ros, name: Topics.HD_NAMED_JOINT_TARGET, messageType: "custom_msg/NamedPose", queue_length: 1, queue_size: 1 }) : null, [ros]);

	// HDS can send a requet to confirm something (continue a task for example)
	// It can also send some string information
	const [hdConfirmation, setHDConfirmation] = useState<((confirm: boolean) => void) | null>(null);
	const [dataConfirmationHD, setDataConfirmationHD] = useState<ConfirmationHd | null>(null);

	// HDS sends a request to select elements on an image.
	// The numberElementToSelect is also part of the request service RockSelection.srv and sets the number of click on the image
	// to continue the process..
	const [hdConfirmationSelectElements, setHDConfirmationSelectElements] = useState<((x: number[], y: number[]) => void) | null>(null);
	const [numberElementToSelect, setNumberElementToSelect] = useState<number>(0);
	const [imageToSelect, setImageToSelect] = useState<string | null>(null);

	// Confirmation when the HDS stack is launched.
	const [hdStackLaunched, setHdStackLaunched] = useState<((confirm: boolean) => void) | null>(null);

	const resetMassTopic = useMemo(() => ros ? new ROSLIB.Topic<any>({ ros, name: Topics.EL_MASS_REQ, messageType: "custom_msg/MassRequest", queue_length: 1, queue_size: 1 }) : null, [ros]);
const ledRequestTopic = useMemo(() => ros ? new ROSLIB.Topic<any>({ ros, name: Topics.EL_LED_COMMANDS, messageType: "custom_msg/LEDRequest", queue_length: 1, queue_size: 1 }) : null, [ros]);

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

	// Cancel an action for a subsystem. If no action is running, it does nothing.
	//
	// The check and the side effects run here rather than inside a setStateActions updater. React
	// calls updaters during the render phase, so raising a snackbar from inside one is an update
	// to another component mid-render: React warns and the snackbar never appears, which turns
	// every rejection below into a button that silently does nothing. cancelAllActions already
	// reads stateActions directly like this.
	const cancelAction = (system: string) => {
		if (stateActions[system].action.state === States.OFF) {
			showSnackbar("error", "No action is running for the system " + system);
			return;
		}

		actionGoal(
			ros,
			system,
			false,
			stateActions[system].action,
			(actions: ActionType) => setStateActions(actions),
			showSnackbar,
			systemsModalOpen,
			stateActions
		);
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

		// Same rule as the per-subsystem cancel in actionGoal: cancelGoal has no callback, so the
		// actions stay ON until each one's result callback reports how it really ended. Clearing
		// them here and reporting success told the operator the rover had stopped when it may not
		// even have accepted the cancel. Pressing Cancel Task again on a subsystem is the escape
		// hatch if the rover never answers.
		cancellableKeys.forEach((key) => {
			stateActions[key].ros_object.cancelGoal(stateActions[key].goal_object);
			console.log("[cancelAllActions] cancel requested", key, stateActions[key].goal_object);
		});

		setStateActions((old) => {
			const newStates = { ...old };
			cancellableKeys.forEach((key) => {
				newStates[key].cancel_requested = true;
			});
			return newStates;
		});

		setSystemsModalOpen((old) => ({
			...old,
			...Object.fromEntries(cancellableKeys.map((key) => [key, false])),
		}));
		showSnackbar(
			"warning",
			`Cancel sent for ${cancellableKeys.join(", ")}. Waiting for the rover to confirm — assume they are still running until it does.`
		);
	};

	// Launch an action for a subsystem with the arguments for ROS. If the system is not enabled, 
	// it shows a snack bar. If an action is already running it's similar.
	// Same reasoning as cancelAction above: gates and side effects belong in the event handler,
	// not in a setStateActions updater that React runs during render.
	const launchAction = (system: string, actionArgs: Object) => {
		if (stateServices[system].service.state === States.OFF) {
			// the system is not ON
			showSnackbar(
				"error",
				"The system " +
					stateServices[system].service.name +
					" needs to be on to start an action"
			);
			return;
		}

		if (
			system === SubSystems.HANDLING_DEVICE &&
			stateServices[SubSystems.HANDLING_DEVICE].service.state !== States.AUTO
		) {
			showSnackbar("error", "Handling Device must be in Auto mode to launch this task");
			return;
		}

		if (stateActions[system].action.state !== States.OFF) {
			showSnackbar("error", "An action is already running for the system " + system);
			return;
		}

		actionGoal(
			ros,
			system,
			true,
			stateActions[system].action,
			(actions: ActionType) => setStateActions(actions),
			showSnackbar,
			actionArgs,
			stateActions
		);
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
			} else if (old === PublishTo.HANDLING_DEVICE) {
				return PublishTo.DRILL;
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
		namedJointTargetTopic?.publish({ data: poseName, vel: 1.0 });
		showSnackbar("info", `Sending HD to: ${poseName}`);
	};

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// HD CONTROL FUNCTIONS

	// Service that triggers Human verification for selecting a something on an image that needs to be collected
	// The name with rocks it not right, please rename it at some point.
	useEffect(() => {
		if (!ros || !isOperator) return;

		const imageSelectionService = new ROSLIB.Service({
			ros: ros,
			name: Topics.REQUEST_SELECTION_IMAGE,
			serviceType: "custom_msg/srv/ControlStationSelection",
		});
		let active = true;

		const clearSelectionPrompt = () => {
			setHDConfirmationSelectElements(null);
			setNumberElementToSelect(0);
			setImageToSelect(null);
		};

		imageSelectionService.advertiseAsync(async (request: any) => {
			if (!active) {
				return { x: [], y: [], success: false };
			}

			setImageToSelect("data:image/jpeg;charset=utf-8;base64," + request.image.data);
			setNumberElementToSelect(request.number_element_to_select);

			return await new Promise<ImageSelectionResult>((resolve) => {
				setHDConfirmationSelectElements(() => (x: number[], y: number[]) => {
					resolve({ x, y, success: true });
					clearSelectionPrompt();
				});
			});
		});

		return () => {
			active = false;
			// Deliberately do NOT resolve a pending request here. Answering { success: false }
			// would tell the rover the operator declined, when in reality the page reloaded or
			// the websocket reconnected. rosbridge aborts in-flight calls on unadvertise
			// (advertise_service.py graceful_shutdown), so the rover sees an error instead of a
			// human decision.
			clearSelectionPrompt();
			try {
				imageSelectionService.unadvertise();
			} catch (error) {
				console.warn("[rosbridge] image selection service cleanup failed:", error);
			}
		};

	}, [ros, isOperator]);

	useEffect(() => {
		if (!ros || !isOperator) return;

		// The Service object does double duty for both calling and advertising services
		const askUserConfirmation = new ROSLIB.Service({
			ros: ros,
			name: Topics.REQUEST_HUMAIN_VERIFICATION_HD,
			serviceType: "custom_msg/srv/HumanVerification",
		});
		let active = true;

		const clearConfirmationPrompt = () => {
			setHDConfirmation(null);
			setDataConfirmationHD(null);
		};

		// Use the advertise() method to indicate that we want to provide this service
		askUserConfirmation.advertiseAsync(async (request: any) => {
			if (!active) {
				return { success: false };
			}

			const defaultValue = request.default_font as boolean;
			const title = request.title;
			const left_color = request.left_color;
			const right_color = request.right_color;
			const left_text = request.left_text;
			const right_text = request.right_text;
			const text_color_left = request.text_color_left;
			const text_color_right = request.text_color_right;

			setDataConfirmationHD({
				default: defaultValue,
				title: title,
				left_color: left_color,
				right_color: right_color,
				left_text: left_text,
				right_text: right_text,
				text_color_left: text_color_left,
				text_color_right: text_color_right
			});

			const result = await new Promise<boolean>((resolve) => {
				setHDConfirmation(() => (confirm: boolean) => {
					resolve(confirm);
					clearConfirmationPrompt();
				});
			});
			return {
				success: result,
			};
		});

		return () => {
			active = false;
			// See the image-selection service above: a page reload or websocket reconnect must not
			// be reported to the rover as the operator answering "no".
			clearConfirmationPrompt();
			try {
				askUserConfirmation.unadvertise();
			} catch (error) {
				console.warn("[rosbridge] HD confirmation service cleanup failed:", error);
			}
		};
	}, [ros, isOperator]);

	useEffect(() => {
		if (!ros || !isOperator) return;

		const hdLaunchTopic = new ROSLIB.Topic({
			ros: ros,
			name: Topics.CONFIRMATION_HDS_LAUNCHED,
			messageType: "std_msgs/Bool",
			queue_length: 1,
			queue_size: 1,
		});
		// This is a one-shot confirmation, not high-rate sensor data: it must not be silently
		// dropped by rosbridge's best-effort/volatile default (see subscribers.py). Force the
		// standard ROS 2 service QoS (rmw_qos_profile_services_default) instead.
		patchTopicRosbridgeQoS(hdLaunchTopic, HDS_CONFIRMATION_SUBSCRIBE_QOS);

		let dialogPending = false;
		const raisePrompt = () => {
			if (dialogPending) return;
			dialogPending = true;
			setHdStackLaunched(() => () => {
				dialogPending = false;
				writeHdStackAckPending(false);
				setHdStackLaunched(null);
			});
		};

		// The prompt is only ever cleared by an operator click, so an unacknowledged one must
		// survive a page reload. The topic is volatile, so DDS will not redeliver it to the new
		// subscriber — the pending flag has to be remembered locally.
		if (readHdStackAckPending()) raisePrompt();

		hdLaunchTopic.subscribe(() => {
			writeHdStackAckPending(true);
			raisePrompt();
		});

		return () => hdLaunchTopic.unsubscribe();
	}, [ros, isOperator]);

	/**
	 * The one case the role check cannot cover on its own: the NUC opened on its own LAN IP while
	 * the backend on :5000 is down. Nobody is then the operator and the rover would block on a
	 * confirmation no screen can answer, silently. A viewer that the backend positively answered
	 * `operator: false` for is the normal case and stays quiet.
	 */
	useEffect(() => {
		if (isOperator || operatorRoleStatus !== "unreachable") return;
		showSnackbar(
			"warning",
			"Operator role unknown (backend :5000 unreachable) — HD confirmations disabled on this screen. Open the CS on the NUC, or append ?operator=1."
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOperator, operatorRoleStatus]);

	/**
	 * True while any dialog is waiting on an operator click. The two service-backed dialogs cannot
	 * survive a reload — the rover's reply travels back over the websocket that the reload
	 * destroys, and the rover does not re-issue the call — so the only real protection is to catch
	 * the refresh before it happens.
	 */
	const confirmationPending =
		hdStackLaunched !== null || hdConfirmationSelectElements !== null || hdConfirmation !== null;

	useEffect(() => {
		if (!confirmationPending) return;

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			// Ignored by every current browser (they show their own wording), but required to
			// trigger the prompt at all.
			event.returnValue = HDS_REFRESH_WARNING;
			return HDS_REFRESH_WARNING;
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [confirmationPending]);

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
	// SCIENCE CONTROL FUNCTIONS

	const resetSensor = (sensor: Sensors) => {
		if(ros) {
			// load cell ids: HD=0, Drill=1
			resetMassTopic?.publish({ id: (sensor == Sensors.MASS_HD) ? 0 : 1, tare: true, change_scale: false, scale: 0.0 })
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
				ledRequestTopic?.publish({ system, mode: 0 })
			})
		}
	}

	const reset_motors = () => {
		if(ros) {
			// mode=EMERGENCY_MOTORS is not tied to a specific system
			ledRequestTopic?.publish({ system: 0, mode: 4 })
		}
	}

	const emergency_shutdown = () => {
		if(ros) {
			// mode=EMERGENCY_SHUTDOWN is not tied to a specific system
			ledRequestTopic?.publish({ system: 0, mode: 5 })
		}
	}

	return [
		roverState,
		dataConfirmationHD,
		setDataConfirmationHD,
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
		sendHdNamedPose,
		updateHdTaskCommand,
		stateTopicDiagnostics
	] as const;
};

export default useRoverControls;
