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
	actionArgs: Object,
	/** Current action state, so the cancel branch can decide without writing from an updater. */
	states: ActionType
) => {
	if (!start) {
		// cancel action
		if (ros === null) {
			snackBar("error", system + ": not connected to rosbridge, cancel not sent");
			return;
		}

		const entry = states[system];

		if (entry.ros_object === null || entry.goal_object === undefined) {
			snackBar("info", "No action for " + system + " is running");
			return;
		}

		if (entry.cancel_requested) {
			// Second press: the rover has not answered the first cancel. Clear the CS state so the
			// operator is not locked out, but be explicit that this is a local reset only -- the
			// arm may well still be moving.
			updateActions((old: ActionType) => {
				const newStates = { ...old };
				newStates[system].goal_params = null;
				newStates[system].goal_object = undefined;
				newStates[system].action.state = States.OFF;
				newStates[system].ros_object = null;
				newStates[system].cancel_requested = false;
				return newStates;
			});
			snackBar(
				"warning",
				system +
					": cleared on the control station only. The rover never confirmed the cancel, so assume the task is STILL RUNNING."
			);
			return;
		}

		// cancelGoal has no callback, so a cancel is a request, not a fact. Reporting "canceled"
		// here and clearing the state (which is what this used to do) tells the operator the arm
		// has stopped when the rover may not have accepted the cancel at all -- and a goal that is
		// still being accepted cannot be cancelled yet, which is exactly when an operator reaches
		// for this button. Keep the action ON until the result callback in the start branch fires,
		// which is what actually reports how the goal ended.
		entry.ros_object.cancelGoal(entry.goal_object);
		console.log("[actionGoal] cancel requested", system, entry.goal_object);

		updateActions((old: ActionType) => {
			const newStates = { ...old };
			newStates[system].cancel_requested = true;
			return newStates;
		});

		snackBar(
			"warning",
			system + ": cancel sent, waiting for the rover to confirm. The task is still running until it does."
		);
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
				newStates[system].cancel_requested = false;
				return newStates;
			});
		};

		// Logged so the field can tell "the browser never sent it" apart from "the rover never
		// answered" without opening the websocket inspector. Pair it with the goal id below.
		console.log("[actionGoal] sending", action.path_action, actionArgs);

		// Feedback arrives continuously once the rover accepts, so log the first one with how long
		// acceptance took -- that number is the click-to-accept delay, and it separates a slow
		// rover from a slow control station -- then throttle the rest instead of flooding the
		// console, which makes every other message impossible to find.
		const sentAt = Date.now();
		let firstFeedbackSeen = false;
		let lastFeedbackLoggedAt = 0;
		const FEEDBACK_LOG_INTERVAL_MS = 2000;

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
				const now = Date.now();
				if (!firstFeedbackSeen) {
					firstFeedbackSeen = true;
					lastFeedbackLoggedAt = now;
					console.log(`[actionGoal] ${system} accepted after ${now - sentAt}ms`, feedback);
					return;
				}
				if (now - lastFeedbackLoggedAt >= FEEDBACK_LOG_INTERVAL_MS) {
					lastFeedbackLoggedAt = now;
					console.log("[actionGoal] feedback", feedback);
				}
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
