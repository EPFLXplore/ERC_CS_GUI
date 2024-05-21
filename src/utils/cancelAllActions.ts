import { getCookie } from "./requests"

const cancelAllActions = async () => {
	const csrftoken = getCookie("csrftoken");
	const data = new FormData();

	const request = new Request("http://" + window.location.host + "/csApp/cancelAllGoal", {
		method: "POST",
		body: data,
		headers: { "X-CSRFToken": csrftoken ?? "" },
	});

	return await fetch(request)
}

export default cancelAllActions