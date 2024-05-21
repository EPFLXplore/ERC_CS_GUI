import { constants } from "fs";
import { getCookie } from "./requests"

const requestChangeMode =  async (system: string, mode: string) => {
	const csrftoken = getCookie("csrftoken");
	console.log("send request")
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

	const request = new Request("http://" + window.location.host + "/csApp/changeModeSystem", {
		method: "POST",
		body: data,
		headers: { "X-CSRFToken": csrftoken ?? "" },
	});

	await fetch(request)
		.then((data) => data.json())
		.then((values) => {
			// values holds the response of the service sent
			console.log(values)
			return values;
			// todo launch popup if error
		})
		.catch((err) => console.log(err));
}

export default requestChangeMode