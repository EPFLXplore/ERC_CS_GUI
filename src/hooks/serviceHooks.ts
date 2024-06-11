import { useState, useEffect } from "react";
import {Service, RuleRover} from "../utils/Service";

const rulesNavigation: RuleRover[] = [{
	"drill": {
		new_mode: ["Auto", "Manual"],
		state_sys: "Off"
	},
	"camera": {
		new_mode: ["Auto", "Manual"],
		state_sys: "On"
	}
}]

const rulesCamera: RuleRover = {
	"navigation": {
		new_mode: ["Off"],
		state_sys: "Off"
	}
}

const rulesDrill: RuleRover = {
	"navigation": {
		new_mode: ["On"],
		state_sys: "Off"
	}
}

function useService(roverState: any, nbr_service: number) {

	const [stateServices, setStateServices] = useState([
		{
			name: "navigation",
			service: new Service("navigation", "Off", rulesNavigation)
		},
		{
			name: "handling_device",
			service: new Service("handling_device", "Off", [])
		},
		{
			name: "camera",
			service: new Service("camra", "Off", [rulesCamera])
		},
		{
			name: "drill",
			service: new Service("drill", "On", [rulesDrill])
		}
	])

	useEffect(() => {
		/*
		setStateServices((old) => {
			let newStates = [...old]

			if(roverState == undefined) {
				return newStates
			}

			for (let i = 0; i < nbr_service; i++) {

				// detect if its another client that changed something
				if(newStates[i].service.state !== roverState["rover"]["status"]["systems"][stateServices[i].name]["status"]) {

					// yes it is, pop up something
				//	console.log("pop up")
				//}
				newStates[i].service.state = roverState["rover"]["status"]["systems"][stateServices[i].name]["status"]
			}

			return newStates
		})
			*/
	}, [roverState]);

	return [stateServices, setStateServices] as const

}

export default useService;
