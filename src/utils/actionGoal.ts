import * as ROSLIB from "roslib";
import Action from "./Action";
import States from "./States";
import { ActionType } from "../hooks/actionsHooks";

const actionGoal = (
	ros: ROSLIB.Ros | null,
	system: string,
	start: boolean,
	action: Action,
	sentAction: (b: boolean) => void,
	updateActions: (states: any) => void,
	snackBar: (sev: string, mes: string) => void,
	actionArgs: Object
) => {
	if (!start) {
		// cancel action
		if (ros === null) return;

		updateActions((old: ActionType) => {
			let newStates = { ...old };

			if (newStates[system].ros_goal !== null) {
				newStates[system].ros_goal = null;
				newStates[system].action.state = States.OFF;

				// TODO CHECK WITH ROVER STATE THAT THE ACTION HAS BEEN CANCELED?
			} else {
				snackBar("info", "No action for " + system + "is running");
			}

			return newStates;
		});
	} else {
		// start action
		if (ros === null) return;

		const actionClient = new ROSLIB.Action({
			ros: ros,
			name: "/Rover/" + action.path_action,
			actionType: "custom_msg/action/" + action.name_action_file,
		});

		console.log(actionArgs);
		actionClient.sendGoal(
			actionArgs,
			(result: any) => {
				console.log(result);
				sentAction(false);
				updateActions((old: ActionType) => {
					const newStates = { ...old };
					newStates[system].action.state = States.OFF; // the action is finished
					newStates[system].ros_goal = null;
					return newStates;
				});
			},
			(feedback: any) => {
				console.log(feedback);
			}
		);

		sentAction(true);
		updateActions((old: ActionType) => {
			const newStates = { ...old };
			newStates[system].action.state = States.ON; // the action starts
			newStates[system].ros_goal = actionArgs;
			return newStates;
		});
	}
};

export default actionGoal;
