import { useState, useEffect } from "react";
import SubSystems from "../utils/SubSystems";
import Action from "../utils/Action";
import States from "../utils/States";
import * as ROSLIB from "roslib";

interface ActionElement {
	action: Action,
	ros_goal: Object | null
}
export type ActionType = { [key: string]: ActionElement }

function useActions(roverState: any, sentAction: boolean,
	snackBar: (sev: string, mes: string) => void
) {

	const [init, setInit] = useState(true)

	const [stateActions, setStateActions] = useState<ActionType>({
		[SubSystems.NAGIVATION]: {
			action: new Action(SubSystems.NAGIVATION, 
				!roverState[SubSystems.NAGIVATION] ? States.OFF : roverState[SubSystems.NAGIVATION]["state"]["mode"],
				"NavigationReachGoal",
				"NAVReachGoal"
			),
			ros_goal: null
		},
		[SubSystems.HANDLING_DEVICE]: {
			action: new Action(SubSystems.HANDLING_DEVICE, 
				!roverState[SubSystems.HANDLING_DEVICE] ? States.OFF : roverState[SubSystems.HANDLING_DEVICE]["state"]["mode"],
				"HandlingDeviceManipulation",
				"HDManipulation"
			),
			ros_goal: null
		},
		[SubSystems.DRILL]: {
			action: new Action(SubSystems.DRILL, 
				!roverState[SubSystems.HANDLING_DEVICE] ? States.OFF : roverState[SubSystems.DRILL]["state"]["mode"],
				"DrillTerrain",
				"DrillTerrain"
			),
			ros_goal: null
		}
	});

	useEffect(() => {
		setStateActions((old) => {
			let newStates = {...old};
			let change: string[] = []

			if (roverState == undefined || roverState["rover"] == undefined) {
				return newStates;
			}

			if(!sentAction) {
				if(newStates[SubSystems.NAGIVATION].action.state !== roverState[SubSystems.NAGIVATION]["state"]["mode"]) {
					newStates[SubSystems.NAGIVATION].action.state = roverState[SubSystems.NAGIVATION]["state"]["mode"]
					if(!init) change.push(SubSystems.NAGIVATION)
				}
				if(newStates[SubSystems.HANDLING_DEVICE].action.state !== roverState[SubSystems.HANDLING_DEVICE]["state"]["mode"]) {
					newStates[SubSystems.HANDLING_DEVICE].action.state = roverState[SubSystems.HANDLING_DEVICE]["state"]["mode"]
					if(!init) change.push(SubSystems.HANDLING_DEVICE)
				}
				if(newStates[SubSystems.DRILL].action.state !== roverState[SubSystems.DRILL]["state"]["mode"]) {
					newStates[SubSystems.DRILL].action.state = roverState[SubSystems.DRILL]["state"]["mode"]
					if(!init) change.push(SubSystems.DRILL)
				}
			}

			if(change.length > 0) {
				snackBar("info", "These action states has been changed: " + change)
			}

			setInit(false)
			return newStates;
		});
	}, [roverState]);

	return [stateActions, setStateActions] as const;
}

export default useActions;
