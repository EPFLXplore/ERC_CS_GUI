import { useState, useEffect } from "react";
import { Service, RuleRover } from "../data/service.type";
import SubSystems from "../data/subsystems.type";
import States from "../data/states.type";
import { AlertColor } from "@mui/material";

const rulesNavigation: RuleRover[] = [
	{
		name: SubSystems.DRILL,
		new_mode: [States.AUTO, States.MANUAL],
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
	nbr_service: number,
	isServiceRequested: boolean,
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
				rulesNavigation
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
				[]
			),
		},
		[SubSystems.CAMERA]: {
			service: new Service(
				SubSystems.CAMERA,
				!roverState["rover"]
					? "Off"
					: roverState["rover"]["status"]["systems"][SubSystems.CAMERA]["status"],
				rulesCamera
			),
		},
		[SubSystems.DRILL]: {
			service: new Service(
				SubSystems.DRILL,
				!roverState["rover"]
					? "Off"
					: roverState["rover"]["status"]["systems"][SubSystems.DRILL]["status"],
				rulesDrill
			),
		},
	});

	useEffect(() => {
		setStateServices((old) => {
			let newStates = { ...old };
			let change: string[] = [];

			if (roverState["rover"] === undefined || roverState === undefined) {
				return newStates;
			}

			if (!isServiceRequested) {
				for (const key in newStates) {
					if (newStates.hasOwnProperty(key)) {
						let service = newStates[key];
						// detect if its another client that changed something
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
			}

			if (change.length > 0) {
				snackBar("info", "These systems have changed their states " + change.join(", "));
			}

			setInit(false);
			return newStates;
		});
	}, [roverState]); // eslint-disable-line react-hooks/exhaustive-deps

	return [stateServices, setStateServices] as const;
}

export default useService;
