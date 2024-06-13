import ROSLIB from "roslib";
import { getCookie } from "./requests"
import Action from "./Action";
import { BooleanKeyframeTrack } from "three";
import States from "./States";
import { ActionType } from "../hooks/actionsHooks";

const actionGoal = (ros: ROSLIB.Ros | null, system: string, start: boolean, action: Action, 
	sentAction: (b: boolean) => void,
	updateActions: (states: any) => void,
	snackBar: (sev: string, mes: string) => void,
	 ...args: any[]) => {
	
	if(!start) {
		// cancel action
		if(ros === null) return
		
		updateActions((old: ActionType) => {
			let newStates = {...old};

			if(newStates[system].ros_goal !== null) {
				newStates[system].ros_goal?.cancel()
				newStates[system].action.state = States.OFF

				// TODO CHECK WITH ROVER STATE THAT THE ACTION HAS BEEN CANCELED?

			} else {
				snackBar("info", "No action for " + system + "is running")
			}

			return newStates
		});

	} else {
		// start action
		if(ros === null) return

		const actionClient = new ROSLIB.ActionClient({
			ros : ros,
			serverName : "/Rover/" + action.path_action,
			actionName : "custom_msg/action/" + action.name_action_file
		});
		
		const goal = new ROSLIB.Goal({
			actionClient : actionClient,
			goalMessage : args // not sure ça marche
		});
		
		goal.on('feedback', function(feedback) {
			console.log(feedback)
		});

		goal.on('result', function(result) {
			console.log(result)
			sentAction(false)
			updateActions((old: ActionType) => {
				const newStates = {...old};
				newStates[system].action.state = States.OFF // the action is finished
				newStates[system].ros_goal = null
				return newStates
			})
		});
	
		sentAction(true)
		goal.send();  // add a timeout ? here as param
		updateActions((old: ActionType) => {
			const newStates = {...old};
			newStates[system].action.state = States.ON // the action starts
			newStates[system].ros_goal = goal
			return newStates
		})
	}
}

export default actionGoal