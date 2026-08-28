/*
Description: Multiple choice request from the HD stack to be displayed as N buttons.
Mirrors custom_msg/srv/MultipleChoiceRequest.srv. The response is the 0-based index
of the option the operator clicked.
*/

export type MultipleChoiceHd = {
	default: boolean;
	title: string;
	color: string;
	text: string;
	text_color: string;
	options: string[];
};
