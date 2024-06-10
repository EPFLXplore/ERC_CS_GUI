import { useState, useEffect } from "react";
import Service from "../utils/Service";

function useService(roverState: any, nbr_service: number) {

	const [stateServices, setStateServices] = useState([
		{
			name: "navigation",
			service: new Service("navigation", false, [["drill", false], ["handling_device", true]])
		},
		{
			name: "handling_device",
			service: new Service("handling_device", false, [])
		},
		{
			name: "camera",
			service: new Service("camra", false, [])
		},
		{
			name: "drill",
			service: new Service("drill", false, [["navigation", false], ["handling_device", true]])
		}
	])

	useEffect(() => {
		setStateServices((old) => {
			let newStates = [...old]

			for (let i = 0; i < nbr_service; i++) {

				// detect if its another client that changed something
				if(newStates[i].service.state !== roverState['rover']['status']['systems'][stateServices[i].name]['status']) {

					// yes it is, pop up something
					console.log("pop up")
				}
				newStates[i].service.state = roverState['rover']['status']['systems'][stateServices[i].name]['status']
			}

			return newStates
		})
	}, [roverState['rover']['status']['systems']]);

	return [stateServices, setStateServices] as const

}

export default useService;
