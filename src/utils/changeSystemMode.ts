import ROSLIB from 'roslib';

const requestChangeMode = (ros: ROSLIB.Ros | null, system: string, mode: string) => {
	const data = new FormData();

	if(system == "drill") {
		data.append("system", "0");
		mode = (mode == "Off") ? "0" : "1";
		data.append("mode", mode);

	} else if (system == "handling_device") {
		data.append("system", "1");
		mode = (mode == "Off") ? "0" : ((mode == "Manual") ? "1" : "2");
		data.append("mode", mode);

	} else if (system == "navigation") {
		data.append("system", "2");
		mode = (mode == "Off") ? "0" : ((mode == "Manual") ? "1" : "2");
		data.append("mode", mode);
		
	} else if (system == "cameras") {
		data.append("system", "3");
		mode = (mode == "Off") ? "0" : "1";
		data.append("mode", mode);
		
	}

	if(ros) {
		var setBoolServer = new ROSLIB.Service({
			ros : ros,
			name : '/set_bool',
			serviceType : 'std_srvs/SetBool'
		});
		
		// Use the advertise() method to indicate that we want to provide this service
		setBoolServer.advertise(function(request, response) {
			console.log('Received service request on ' + setBoolServer.name + ': ' + request.data);
			response['success'] = true;
			response['message'] = 'Set successfully';
			return true;
		});
	}
	
}

export default requestChangeMode