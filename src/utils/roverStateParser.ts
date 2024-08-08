/**
 * This file contains functions that parse the rover state data and return the
 * values contained in the data.
 *
 * @author Ugo Balducci
 * @version 1.0
 */

import SubSystems from "../data/subsystems.type";

//#region General
//////////////////////// GENERAL ////////////////////////

const getStateSystem = (data: any, system: SubSystems) => {
	if (!data[system]) {
		return "OFF";
	}

	return data[system]["state"]["mode"];
};

//#endregion

//#region Navigation
//////////////////////// NAVIGATION ////////////////////////

/**
 * Get the speeds of the wheels of the rover.
 * @param data The rover state data.
 * @returns The speeds of the wheels in m/s.
 */
const getWheelsSpeed = (data: any) => {
	if (!data["navigation"]) {
		return [];
	}

	const wheels = data["navigation"]["wheels"];
	const speeds = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		speeds.push(wheels[wheel]["speed"]);
	}

	return speeds;
};

/**
 * Get the steering angles of the wheels of the rover.
 * @param data The rover state data.
 * @returns The steering angles of the wheels in degrees.
 */
const getSteeringAngles = (data: any) => {
	if (!data["navigation"]) {
		return [];
	}

	const wheels = data["navigation"]["wheels"];
	const angles = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		angles.push(wheels[wheel]["steering_angle"]);
	}

	return angles;
};

/**
 * Get the angle of the pivot wheel of the rover.
 * @param data The rover state data.
 * @returns The angle of the pivot wheel in degrees.
 */
const getPivotAngle = (data: any) => {
	if (!data["navigation"]) {
		return 0;
	}

	return data["navigation"]["wheels"]["pivot"]["angle"];
};

//#endregion

//#region Handling Device
//////////////////////// HANDLING DEVICE ////////////////////////

/**
 * Get the positions of the joints of the handling device.
 * @param data The rover state data.
 * @returns The positions of the joints in degrees.
 */
const getJointsPositions = (data: any) => {
	if (!data["handling_device"]) {
		return [];
	}

	const joints = data["handling_device"]["joints"];
	const positions = [];

	for (const joint in joints) {
		positions.push(joints[joint]["angle"]);
	}

	return positions;
};

//#endregion

//#region Electronics
//////////////////////// ELECTRONICS ////////////////////////

const BATTERY_MAX_VOLTAGE = 29;
const BATTERY_MIN_VOLTAGE = 24;

/**
 * Get the battery level of the rover.
 * @param data The rover state data.
 * @returns The battery level of the rover in percentage.
 */
const getBatteryLevel = (data: any) => {
	if (!data["electronics"]) {
		return 0;
	}

	return (
		(data["electronics"]["power"]["voltage"] -
			BATTERY_MIN_VOLTAGE / (BATTERY_MAX_VOLTAGE - BATTERY_MIN_VOLTAGE)) *
		100
	);
};

//#endregion

export {
	getStateSystem,
	getJointsPositions,
	getWheelsSpeed,
	getSteeringAngles,
	getPivotAngle,
	getBatteryLevel,
};
