import { useState, useEffect } from "react";
import SubSystems from "../data/subsystems.type";
import Action from "../data/action.type";
import States from "../data/states.type";
import { AlertColor } from "@mui/material";

interface ActionElement {
	action: Action;
	goal_params: Object | null;
	goal_object: string | undefined;
	ros_object: any;
}
export type ActionType = { [key: string]: ActionElement };

function useActions(
	roverState: any,
	sentAction: boolean,
	snackBar: (sev: AlertColor, mes: string) => void
) {

	const [stateActions, setStateActions] = useState<ActionType>({
		[SubSystems.NAGIVATION]: {
			action: new Action(
				SubSystems.NAGIVATION,
				!roverState[SubSystems.NAGIVATION]
					? States.OFF
					: roverState[SubSystems.NAGIVATION]["state"]["mode"],
				"/CS/NavigationReachGoal",
				"NAVReachGoal"
			),
			goal_params: null,
			goal_object: undefined,
			ros_object: null,
		},
		[SubSystems.HANDLING_DEVICE]: {
			action: new Action(
				SubSystems.HANDLING_DEVICE,
				!roverState[SubSystems.HANDLING_DEVICE]
					? States.OFF
					: roverState[SubSystems.HANDLING_DEVICE]["state"]["mode"],
				"/CS/HandlingDeviceManipulation",
				"HDManipulation"
			),
			goal_params: null,
			goal_object: undefined,
			ros_object: null,
		},
		[SubSystems.DRILL]: {
			action: new Action(
				SubSystems.DRILL,
				!roverState[SubSystems.DRILL]
					? States.OFF
					: roverState[SubSystems.DRILL]["state"]["mode"],
				"CS/DrillTerrain",
				"DrillCmd"
			),
			goal_params: null,
			goal_object: undefined,
			ros_object: null,
		},
	});
	const [askingUserConfirmation, setAskingUserConfirmation] = useState(false);

	return [stateActions, setStateActions] as const;
}

export default useActions;
