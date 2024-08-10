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

/**
 * Get the current position of the rover.
 * @param data The rover state data.
 * @returns The position of the rover in meters.
 */
const getCurrentPosition = (data: any) => {
	if (!data["navigation"]) {
		return { x: 0, y: 0 };
	}

	return {
		x: data["navigation"]["localization"]["position"]["x"],
		y: data["navigation"]["localization"]["position"]["y"],
	};
};

/**
 * Get the current orientation of the rover.
 * @param data The rover state data.
 * @returns The orientation of the rover in degrees.
 */
const getCurrentOrientation = (data: any) => {
	if (!data["navigation"]) {
		return 0;
	}

	return data["navigation"]["localization"]["orientation"]["z"];
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

//#region Science
//////////////////////// SCIENCE ////////////////////////

/**
 * Get the encoder value of the drill.
 * @param data The rover state data.
 * @returns The encoder value of the drill in degrees.
 */
const getDrillEncoderValue = (data: any) => {
	if (!data["drill"]) {
		return 0;
	}

	return data["drill"]["motors"]["motor_module"]["position"];
};

/**
 * Get the rotation of the drill screw.
 * @param data The rover state data.
 * @returns The rotation of the drill screw in degrees.
 */
const getDrillScrewRotation = (data: any) => {
	if (!data["drill"]) {
		return 0;
	}

	return data["drill"]["motors"]["motor_drill"]["speed"];
};

//#endregion

export {
	getStateSystem,
	getJointsPositions,
	getWheelsSpeed,
	getSteeringAngles,
	getPivotAngle,
	getCurrentPosition,
	getCurrentOrientation,
	getDrillEncoderValue,
	getDrillScrewRotation,
	getBatteryLevel,
};
