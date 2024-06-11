import ROSLIB from 'roslib';
import {Service} from './Service';

const requestChangeMode = (ros: ROSLIB.Ros | null, system: string, mode: string, ser: Service) => {

	let request;

	if (system == "navigation") {
		request = {
			system: 0,
			mode: (mode == "Off") ? "0" : ((mode == "Manual") ? "1" : "2")
		};
	
	} else if (system == "handling_device") {
		request = {
			system: 1,
			mode: (mode == "Off") ? "0" : ((mode == "Manual") ? "1" : "2")
		};

	} else if (system == "cameras") {
		request = {
			system: 2,
			mode: (mode == "Off") ? "0" : "1"
		};
	} else if(system == "drill") {
		request = {
			system: 3,
			mode: (mode == "Off") ? "0" : "1"
		};

	}

	if(ros) {
		const changeModeSystem = new ROSLIB.Service({
			ros : ros,
			name : '/Rover/ChangeModeSystem',
			serviceType : 'custom_msg/srv/ChangeModeSystem'
		});

		changeModeSystem.callService(request, (res) => successfullChange(res, ser), failChange);
	}
}

const successfullChange = (result: any, ser: Service) => {
	if(result["error_types"] == 0) {
		// no error has occured
		console.log("pop up something for good change mode system")
		//ser.status = result["systems_state"]
		ser.state = "Auto"
	} else {
		console.log(result["error_message"])
	}
}

const failChange = (error: string) => {
	console.log(error)
}

export default requestChangeMode