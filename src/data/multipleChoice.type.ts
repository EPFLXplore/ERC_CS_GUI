/*
Description: Multiple choice request from the HD stack to be displayed as N buttons.
Mirrors custom_msg/srv/MultipleChoiceRequest.srv. The response is the 0-based index
of the option the operator clicked.

color and text_color are parallel to options -- one entry per button. They may be
shorter than options (or empty), in which case the remaining buttons keep the
default stylesheet look.
*/

export type MultipleChoiceHd = {
	default: boolean;
	title: string;
	colors: string[];
	text: string;
	text_colors: string[];
	options: string[];
};
