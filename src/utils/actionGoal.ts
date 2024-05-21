import { getCookie } from "./requests"

const actionGoal = async (system: string, start: boolean) => { // need to add kwargs....
	const csrftoken = getCookie("csrftoken");
	const data = new FormData();
	let request: Request

	if(!start) {
		// cancel action

		data.append("name", system)

		request = new Request("http://" + window.location.host + "/csApp/cancelAction", {
			method: "POST",
			body: data,
			headers: { "X-CSRFToken": csrftoken ?? "" },
		});

	} else {
		// start action

		// add data

		request = new Request("http://" + window.location.host + "/csApp/startAction", {
		method: "POST",
		body: data,
		headers: { "X-CSRFToken": csrftoken ?? "" },
	});
	}

	return await fetch(request);
}

export default actionGoal