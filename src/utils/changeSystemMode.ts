import ROSLIB from 'roslib';

const requestChangeMode = (ros: ROSLIB.Ros | null, system: string, mode: string) => {

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
		var changeModeSystem = new ROSLIB.Service({
			ros : ros,
			name : '/Rover/ChangeModeSystem',
			serviceType : ''
		});

		changeModeSystem.callService(request, successfullChange, failChange);
	}
	
}

const successfullChange = (result: any) => {
	if(result['error_types'] == 0) {
		// no error has occured
		console.log("pop up something for good change mode system")
	} else {
		console.log(result['error_message'])
	}
}

const failChange = (error: string) => {
	console.log(error)
}

export default requestChangeMode