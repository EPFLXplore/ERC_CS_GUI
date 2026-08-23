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
	updateActions: (states: any) => void,
	snackBar: (sev: AlertColor, mes: string) => void,
	actionArgs: Object
) => {
	if (!start) {
		// cancel action
		if (ros === null) {
			snackBar("error", system + ": not connected to rosbridge, cancel not sent");
			return;
		}

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
		if (ros === null) {
			// Used to return silently, which looks exactly like the button doing nothing: no goal
			// sent, no error, nothing in the console. ros is null whenever the websocket is down
			// or reconnecting, so say so rather than leaving the operator to guess.
			snackBar("error", system + ": not connected to rosbridge, task not sent");
			return;
		}

		const actionClient = new ROSLIB.Action({
			ros: ros,
			name: action.path_action,
			actionType: "custom_msg/action/" + action.name_action_file,
		});

		// Marking the action finished has to happen on every way a goal can end, not just on a
		// result. launchAction refuses a new goal while action.state is not OFF, so a single
		// rejected or errored goal that left it ON would block every later task for this system
		// until the operator hit Cancel Task or reloaded the page.
		const markFinished = () => {
			updateActions((old: ActionType) => {
				const newStates = { ...old };

				newStates[system].action.state = States.OFF;
				newStates[system].goal_params = null;
				newStates[system].goal_object = undefined;
				newStates[system].ros_object = null;
				return newStates;
			});
		};

		// Logged so the field can tell "the browser never sent it" apart from "the rover never
		// answered" without opening the websocket inspector. Pair it with the goal id below.
		console.log("[actionGoal] sending", action.path_action, actionArgs);

		const goalHandle = actionClient.sendGoal(
			actionArgs,
			(result: any) => {
				markFinished();

				console.log(result)
				if(result.error_type === 0) {
					snackBar("success", system + ": " + result.result)
				} else {
					snackBar("error", system + ": " + result.result + "  /  " + result.error_message)
				}
			},
			(feedback: any) => {
				console.log(feedback);

			},
			(error: string) => {
				console.log(error)
				markFinished()
				snackBar("error", system + ": " + error)
			}
		);
		if (goalHandle === undefined) {
			// roslib returns undefined without sending anything. Marking the action ON here would
			// wedge the subsystem: launchAction refuses new goals while it is ON, and Cancel Task
			// only clears state when goal_object is set, so nothing short of a page reload
			// recovers it.
			console.error("[actionGoal] sendGoal returned no goal handle", action.path_action);
			snackBar("error", system + ": task was not sent (no goal handle)");
			return;
		}

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
