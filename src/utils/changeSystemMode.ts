import { getCookie } from "./requests"

const requestChangeMode = (system: string, mode: any) => {
    const csrftoken = getCookie("csrftoken");
	console.log("change")

    const data = new FormData();
	data.append("system", system);
    data.append("mode", mode);

    return new Request("http://" + window.location.host + "/csApp/changeModeSystem/", {
		method: "POST",
		body: data,
		headers: { "X-CSRFToken": csrftoken ?? "" },
	});
}

export default requestChangeMode