import { getCookie } from "./requests"

const requestChangeMode = (system: string, mode: any) => {
    const csrftoken = getCookie("csrftoken");

    const data = new FormData();
	data.append("system", system);
    data.append("mode", mode);

    return new Request("http://" + window.location.host + "/csApp/changeModeSystem/" + system + "/", {
		method: "POST",
		body: data,
		headers: { "X-CSRFToken": csrftoken ?? "" },
	});
}

export default requestChangeMode