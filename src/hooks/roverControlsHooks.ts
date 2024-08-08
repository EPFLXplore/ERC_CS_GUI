import { ReactElement, useEffect, useState } from "react";
import useService from "./serviceHooks";
import useActions, { ActionType } from "./actionsHooks";
import useRoverState from "./roverStateHooks";
import useNewCamera from "./newCameraHooks";
import SubSystems from "../utils/SubSystems";
import { Task } from "../utils/tasks.type";
import actionGoal from "../utils/actionGoal";
import States from "../utils/States";
import { AlertColor } from "@mui/material";
import * as ROSLIB from "roslib";
import requestChangeMode from "../utils/changeSystemMode";

const MAX_CAMERAS = 5;
const NBR_SERVICES = 4;

const useRoverControls = (
	ros: ROSLIB.Ros | null,
	showSnackbar: (sev: AlertColor, mes: string) => void
) => {
	const [roverState] = useRoverState(ros);
	const [images, rotateCams, currentVideo, setCurrentVideo] = useNewCamera(ros);

	const [dataOpen, setDataOpen] = useState(false);
	const [display, setDisplay] = useState("camera");

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
	const [modal, setModal] = useState<ReactElement | null>(null);
	const [dataFocus, setDataFocus] = useState<string[]>([]);

	const [point, setPoint] = useState({ x: -10, y: -10 });

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
				(actions: ActionType) => setStateActions(actions),
				showSnackbar,
				{}
			);

			return newStates;
		});
	};

	const launchAction = (system: string, actionArgs: Object) => {
		console.log(actionArgs);
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
				showSnackbar,
				actionArgs
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
		setModal,
		dataFocus,
		cancelAction,
		launchAction,
		startService,
		changeMode,
		triggerDataFocus,
		point,
		setPoint,
	] as const;
};

export default useRoverControls;
