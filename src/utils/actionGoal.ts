import { getCookie } from "./requests"

const actionGoal = async (system: string, start: boolean, ...args: any[]) => {
	const csrftoken = getCookie("csrftoken");
	const data = new FormData();
	let request: Request

	data.append("name", system)

	if(!start) {
		// cancel action

		request = new Request("http://" + window.location.host + "/csApp/cancelAction", {
			method: "POST",
			body: data,
			headers: { "X-CSRFToken": csrftoken ?? "" },
		});

	} else {
		// start action

		// add data
		for(let i = 0; i < args.length; i++) {
			data.append(i.toString(), args[i].toString())
		}

		request = new Request("http://" + window.location.host + "/csApp/startAction", {
		method: "POST",
		body: data,
		headers: { "X-CSRFToken": csrftoken ?? "" },
	});
	}

	return await fetch(request);
}

export default actionGoal