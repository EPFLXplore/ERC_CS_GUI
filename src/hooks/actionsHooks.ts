import { useState, useEffect } from "react";
import SubSystems from "../data/subsystems.type";
import Action from "../data/action.type";
import States from "../data/states.type";
import { AlertColor } from "@mui/material";

interface ActionElement {
	action: Action;
	goal_params: Object | null;
	goal_object: string | undefined;
	ros_object: any
}
export type ActionType = { [key: string]: ActionElement };

function useActions(
	roverState: any,
	sentAction: boolean,
	snackBar: (sev: AlertColor, mes: string) => void
) {
	const [init, setInit] = useState(true);

	const [stateActions, setStateActions] = useState<ActionType>({
		[SubSystems.NAGIVATION]: {
			action: new Action(
				SubSystems.NAGIVATION,
				!roverState[SubSystems.NAGIVATION]
					? States.OFF
					: roverState[SubSystems.NAGIVATION]["state"]["mode"],
				"NavigationReachGoal",
				"NAVReachGoal"
			),
			goal_params: null,
			goal_object: undefined,
			ros_object: null
		},
		[SubSystems.HANDLING_DEVICE]: {
			action: new Action(
				SubSystems.HANDLING_DEVICE,
				!roverState[SubSystems.HANDLING_DEVICE]
					? States.OFF
					: roverState[SubSystems.HANDLING_DEVICE]["state"]["mode"],
				"HandlingDeviceManipulation",
				"HDManipulation"
			),
			goal_params: null,
			goal_object: undefined,
			ros_object: null
		},
		[SubSystems.DRILL]: {
			action: new Action(
				SubSystems.DRILL,
				!roverState[SubSystems.HANDLING_DEVICE]
					? States.OFF
					: roverState[SubSystems.DRILL]["state"]["mode"],
				"DrillTerrain",
				"DrillCmd"
			),
			goal_params: null,
			goal_object: undefined,
			ros_object: null
		},
	});

	useEffect(() => {
		setStateActions((old) => {
			let newStates = { ...old };
			let change: string[] = [];

			if (roverState === undefined || roverState["rover"] === undefined) {
				return newStates;
			}

			if (!sentAction) {
				if (
					newStates[SubSystems.NAGIVATION].action.state !==
					roverState[SubSystems.NAGIVATION]["state"]["mode"]
				) {
					newStates[SubSystems.NAGIVATION].action.state =
						roverState[SubSystems.NAGIVATION]["state"]["mode"];
					if (!init) change.push(SubSystems.NAGIVATION);
				}
				if (
					newStates[SubSystems.HANDLING_DEVICE].action.state !==
					roverState[SubSystems.HANDLING_DEVICE]["state"]["mode"]
				) {
					newStates[SubSystems.HANDLING_DEVICE].action.state =
						roverState[SubSystems.HANDLING_DEVICE]["state"]["mode"];
					if (!init) change.push(SubSystems.HANDLING_DEVICE);
				}
				if (
					newStates[SubSystems.DRILL].action.state !==
					roverState[SubSystems.DRILL]["state"]["mode"]
				) {
					newStates[SubSystems.DRILL].action.state =
						roverState[SubSystems.DRILL]["state"]["mode"];
					if (!init) change.push(SubSystems.DRILL);
				}
			}

			if (change.length > 0) {
				snackBar("info", "These action states has been changed: " + change);
			}

			setInit(false);
			return newStates;
		});
	}, [roverState]); // eslint-disable-line react-hooks/exhaustive-deps

	return [stateActions, setStateActions] as const;
}

export default useActions;
