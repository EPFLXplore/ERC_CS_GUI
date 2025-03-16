import { useState, useEffect } from "react";
import { Service, RuleRover } from "../data/service.type";
import SubSystems from "../data/subsystems.type";
import States from "../data/states.type";
import { AlertColor } from "@mui/material";

/*
Author: Giovanni Ranieri
Year: 2024
Description: Hook for managing the services currently running and everything related to them. The main object
is the stateServices that holds the objects Service. 
*/

// These are a set of rules to activate a subsystem. For example the first one is the navigation.
// The first rule is for the DRILL. To change the NAV in AUTO or MANUAL, the DRILL needs to be OFF
const rulesNavigation: RuleRover[] = [
	{
		name: SubSystems.DRILL,
		new_mode: [States.AUTO, States.ACKERMANN, States.OMNI_DIRECTIONAL],
		state_sys: States.OFF,
	},
	{
		name: SubSystems.CAMERA,
		new_mode: [States.AUTO],
		state_sys: States.OFF,
	},
];

const rulesCamera: RuleRover[] = [
	{
		name: SubSystems.NAGIVATION,
		new_mode: [States.OFF],
		state_sys: States.OFF,
	},
];

const rulesDrill: RuleRover[] = [
	{
		name: SubSystems.NAGIVATION,
		new_mode: [States.ON],
		state_sys: States.OFF,
	},
];

interface ServiceElement {
	service: Service;
}
type ServiceType = { [key: string]: ServiceElement };

function useService(
	roverState: any,
	snackBar: (severity: AlertColor, message: string) => void
) {
	const [init, setInit] = useState(true);

	const [stateServices, setStateServices] = useState<ServiceType>({
		[SubSystems.NAGIVATION]: {
			service: new Service(
				SubSystems.NAGIVATION,
				!roverState["rover"]
					? "Off"
					: roverState["rover"]["status"]["systems"][SubSystems.NAGIVATION]["status"],
				rulesNavigation,
				false,
				[States.AUTO]
			),
		},
		[SubSystems.HANDLING_DEVICE]: {
			service: new Service(
				SubSystems.HANDLING_DEVICE,
				!roverState["rover"]
					? "Off"
					: roverState["rover"]["status"]["systems"][SubSystems.HANDLING_DEVICE][
							"status"
					  ],
				[],
				false,
				[States.AUTO]
			),
		},
		[SubSystems.DRILL]: {
			service: new Service(
				SubSystems.DRILL,
				!roverState["rover"]
					? "Off"
					: roverState["rover"]["status"]["systems"][SubSystems.DRILL]["status"],
				rulesDrill,
				false,
				[]
			),
		},
	});

	// This function synchronize the changes between 2 CS. If the roverState differs from the CS, we update
	// the CS states. For example, if someone changes the state of NAV, it will change also on your CS.
	useEffect(() => {
		setStateServices((old) => {
			let newStates = { ...old };
			let change: string[] = [];

			if (roverState === undefined || roverState["rover"] === undefined) {
				return newStates;
			}

			for (const key in newStates) {
				if (newStates.hasOwnProperty(key)) {
					let service = newStates[key];
					// detect if rover state is different than client
					if (
						service.service.state !==
						roverState["rover"]["status"]["systems"][
							stateServices[key].service.name
						]["status"]
					) {
						// yes it is, pop up something
						service.service.state =
							roverState["rover"]["status"]["systems"][
								stateServices[key].service.name
							]["status"];
						if (!init) {
							change.push(
								`${stateServices[key].service.name} -> ${service.service.state}`
							);
						}
					}
				}
			}

			if (change.length > 0) {
				snackBar("success", "Systems changed: " + change.join(", "));
			}

			setInit(false);
			return newStates;
		});
	}, [roverState]); // eslint-disable-line react-hooks/exhaustive-deps

	return [stateServices, setStateServices] as const;
}

export default useService;
