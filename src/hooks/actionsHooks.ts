import { useState, useEffect } from "react";
import SubSystems from "../data/subsystems.type";
import Action from "../data/action.type";
import States from "../data/states.type";
import { AlertColor } from "@mui/material";

/*
Author: Giovanni Ranieri
Year: 2024
Description: Hook for managing the actions currently running and everything related to them. The main object
is the stateActions that holds the objects Action and the goal objects and references when an action is
launched. 
*/

interface ActionElement {
	action: Action;
	goal_params: Object | null;
	goal_object: string | undefined;
	ros_object: any;
}
export type ActionType = { [key: string]: ActionElement };

function useActions(
	roverState: any,
) {

	// goal_params: arguments of the action
	// goal_object: sendGoal return value
	// ros_object: object ROS.Action

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

	//const [askingUserConfirmation, setAskingUserConfirmation] = useState(false);

	return [stateActions, setStateActions] as const;
}

export default useActions;
