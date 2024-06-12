import { useState, useEffect } from "react";
import {Service, RuleRover} from "../utils/Service";
import SubSystems from "../utils/SubSystems";
import States from "../utils/States";

const rulesNavigation: RuleRover[] = [
	{
		name: SubSystems.DRILL,
		new_mode: [States.AUTO, States.MANUAL],
		state_sys: States.OFF
	},
	{
		name: SubSystems.CAMERA,
		new_mode: [States.AUTO],
		state_sys: States.OFF

	}
]

const rulesCamera: RuleRover[] = [{
	name: SubSystems.NAGIVATION,
	new_mode: [States.OFF],
	state_sys: States.OFF
}]

const rulesDrill: RuleRover[] = [{
	name: SubSystems.NAGIVATION,
	new_mode: [States.ON],
	state_sys: States.OFF
}]

function useService(roverState: any, nbr_service: number, isServiceRequested: boolean, 
	snackBar: (severity: string, message: string) => void) {

	const [init, setInit] = useState(true)

	const [stateServices, setStateServices] = useState([
		{
			name: SubSystems.NAGIVATION,
			service: new Service(SubSystems.NAGIVATION, !roverState["rover"]
				? "Off"
				: roverState["rover"]["status"]["systems"][SubSystems.NAGIVATION]["status"], rulesNavigation)
		},
		{
			name: SubSystems.HANDLING_DEVICE,
			service: new Service(SubSystems.HANDLING_DEVICE, !roverState["rover"]
				? "Off"
				: roverState["rover"]["status"]["systems"][SubSystems.HANDLING_DEVICE]["status"], [])
		},
		{
			name: SubSystems.CAMERA,
			service: new Service(SubSystems.CAMERA, !roverState["rover"]
				? "Off"
				: roverState["rover"]["status"]["systems"][SubSystems.CAMERA]["status"], rulesCamera)
		},
		{
			name: SubSystems.DRILL,
			service: new Service(SubSystems.DRILL, !roverState["rover"]
				? "Off"
				: roverState["rover"]["status"]["systems"][SubSystems.DRILL]["status"], rulesDrill)
		}
	])

	useEffect(() => {
		setStateServices((old) => {
			let newStates = [...old]
			let change: string[] = []

			if(roverState["rover"] == undefined) {
				return newStates
			}

			if(init) {
				setInit(false)
				return newStates
			}

			if(!isServiceRequested) {
				for (let i = 0; i < nbr_service; i++) {

					// detect if its another client that changed something
					if(newStates[i].service.state !== roverState["rover"]["status"]["systems"][stateServices[i].name]["status"]) {
	
						// yes it is, pop up something
						newStates[i].service.state = roverState["rover"]["status"]["systems"][stateServices[i].name]["status"]
						change.push(stateServices[i].name) 
					}
				}
			}

			if(change.length > 0) {
				console.log("eroignerégijerkpgojrtkgéjlkrepgkln")
				snackBar("error", "These systems have changed their states")
			}

			return newStates
		})
	}, [roverState]);

	return [stateServices, setStateServices] as const

}

export default useService;
