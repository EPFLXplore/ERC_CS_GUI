import { useState, useEffect } from "react";
import Action from "../utils/Action";

function useActions(roverState: any, nbr_actions: number, stateServices: any[]) {
	const [stateActions, setStateActions] = useState([
		{
			name: "navigation",
			running: false,
		},
		{
			name: "handling_device",
			running: false,
		},
		{
			name: "drill",
			running: false,
		},
	]);

	useEffect(() => {
		setStateActions((old) => {
			let newStates = [...old];

			if (roverState == undefined) {
				return newStates;
			}

			// for each system (depends where is stored the state of actions)
			// 1: newStates[i].running !== roverState[...] => popup
			// 2: ewStates[i].running = roverState[...] => assign

			return newStates;
		});
	}, [roverState == undefined, roverState]); // add the path of changes

	return [stateActions, setStateActions] as const;
}

export default useActions;
