/*
Author: Ugo Balducci
Year: 2023
Description: Types of states for subsystems. This helps having the same names everywhere
*/

enum States {
	ON = "On",
	OFF = "Off",
	MANUAL = "Manual",
	MANUAL_INVERSE = "Manual Inverse",
	MANUAL_DIRECT = "Manual Direct",
	AUTO = "Auto",
}

export default States;
