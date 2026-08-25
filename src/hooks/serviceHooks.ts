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

// Rules that gate activating a subsystem: each entry says "to enter one of `new_mode`, subsystem
// `name` must be in `state_sys`". Evaluated by Service.canChange, enforced in startService.
//
// NAV and DRILL used to lock each other out (drill only ON with NAV Off, and vice versa), which
// forced the operator to tear down the NAV mode just to start drilling. That interlock now lives
// where the actual requirement is: while the drill is on, the NAV gamepad publishes zeroed axes so
// the rover cannot move (see isDrillOn / sendCommand in gamepadHooks).
const rulesNavigation: RuleRover[] = [];

const rulesDrill: RuleRover[] = [];

interface ServiceElement {
	service: Service;
}
type ServiceType = { [key: string]: ServiceElement };

function useService(
	roverState: any,
	snackBar: (severity: AlertColor, message: string) => void
) {
	const [init, setInit] = useState(true);

	// Helper function to get subsystem state from new structure
	const getSubsystemState = (subsystemKey: string) => {
		if (!roverState || !roverState[subsystemKey]) {
			return States.OFF; // Use States enum value: "Off"
		}
		// Each subsystem publishes state.mode in their 1Hz message
		return roverState[subsystemKey]?.state?.mode || States.OFF;
	};

	const [stateServices, setStateServices] = useState<ServiceType>({
		[SubSystems.NAGIVATION]: {
			service: new Service(
				SubSystems.NAGIVATION,
				getSubsystemState("navigation"),
				rulesNavigation,
				false
			),
		},
		[SubSystems.HANDLING_DEVICE]: {
			service: new Service(
				SubSystems.HANDLING_DEVICE,
				getSubsystemState("handling_device"),
				[],
				false
			),
		},
		[SubSystems.DRILL]: {
			service: new Service(
				SubSystems.DRILL,
				getSubsystemState("drill"),
				rulesDrill,
				false
			),
		},
	});

	// This function synchronize the changes between 2 CS. If the roverState differs from the CS, we update
	// the CS states. For example, if someone changes the state of NAV, it will change also on your CS.
	useEffect(() => {
		setStateServices((old) => {
			let newStates = { ...old };
			let change: string[] = [];

			if (roverState === undefined) {
				return newStates;
			}

			// Map subsystem names to their keys in roverState
			const subsystemKeyMap: { [key: string]: string } = {
				[SubSystems.NAGIVATION]: "navigation",
				[SubSystems.HANDLING_DEVICE]: "handling_device",
				[SubSystems.DRILL]: "drill",
			};

			for (const key in newStates) {
				if (newStates.hasOwnProperty(key)) {
					let service = newStates[key];
					const subsystemKey = subsystemKeyMap[key];
					
					// Get current state from per-subsystem state topic
					const currentState = roverState[subsystemKey]?.state?.mode || States.OFF;
					
					// detect if rover state is different than client
					if (service.service.state !== currentState) {
						// yes it is, pop up something
						service.service.state = currentState;
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

	return [stateServices] as const;
}

export default useService;
