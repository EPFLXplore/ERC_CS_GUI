import * as ROSLIB from "roslib";
import Action from "../data/action.type";
import States from "../data/states.type";
import { ActionType } from "../hooks/actionsHooks";
import { AlertColor } from "@mui/material";

const actionGoal = (
	ros: ROSLIB.Ros | null,
	system: string,
	start: boolean,
	action: Action,
	sentAction: (b: boolean) => void,
	updateActions: (states: any) => void,
	snackBar: (sev: AlertColor, mes: string) => void,
	actionArgs: Object
) => {
	if (!start) {
		// cancel action
		if (ros === null) return;

		updateActions((old: ActionType) => {
			let newStates = { ...old };

			if (newStates[system].ros_object !== null && newStates[system].goal_object !== undefined) {

				newStates[system].ros_object.cancelGoal(newStates[system].goal_object)

				// TODO: checker d'une certaine manière dans le rover state que y'a plus d'action car on a pas
				// de callback sur le cancelGoal(). 

				newStates[system].goal_params = null;
				newStates[system].goal_object = undefined;
				newStates[system].action.state = States.OFF;
				newStates[system].ros_object = null;
				snackBar("success", "Action for " + system + "has been canceled (correctly we need to check the status on the rover state of the subsystem)");
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
		//sentAction(true);
		const goalHandle = actionClient.sendGoal(
			actionArgs,
			(result: any) => {
				console.log(result);
				updateActions((old: ActionType) => {
					const newStates = { ...old };			

					newStates[system].action.state = States.OFF;
					newStates[system].goal_params = null;
					newStates[system].goal_object = undefined;
					newStates[system].ros_object = null;
					return newStates;
				});

				snackBar("success", "Action " + system + " successfully completed")
			},
			(feedback: any) => {
				console.log(feedback);
				
			},
			(error: string) => {
				console.log(error)
			}
		);
		updateActions((old: ActionType) => {
			const newStates = { ...old };
			newStates[system].action.state = States.ON;
			newStates[system].goal_params = actionArgs;
			newStates[system].goal_object = goalHandle;
			newStates[system].ros_object = actionClient;
			return newStates;
		});
	}
};

export default actionGoal;
