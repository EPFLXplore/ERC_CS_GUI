/**
 * This file contains functions that parse the rover state data and return the
 * values contained in the data.
 *
 * @author Ugo Balducci, Giovanni Ranieri
 * @version 1.0
 */

import SubSystems from "../data/subsystems.type";

//////////////////////// GENERAL ////////////////////////

const getStateSystem = (data: any, system: SubSystems) => {
	if (!data || !data[system]) {
		return "OFF";
	}

	return data[system]["state"]["mode"];
};

/**
 * Return all warnings
 * @param data the rover state data
 * @returns the warnings
 */
const getWarnings = (data: any) => {
	if(!data || !data['rover']) {
		return [];
	}

	return data['rover']['status']['warnings']
}

/**
 * Return all errors
 * @param data the rover state data
 * @returns the errors
 */
const getErrors = (data: any) => {
	if(!data || !data['rover']) {
		return [];
	}

	return data['rover']['status']['errors']
}

/**
 * Return the signal strength of the CS antenna
 * @param data the rover state data
 * @returns the signal strength in dBm
 */
const getdBm = (data: any) => {
	if (!data || !data["rover"]) {
		return 0.0;
	}

	return Number(data["rover"]["network"]["signal_strength"]);
};


//////////////////////// NAVIGATION ////////////////////////

/**
 * Get the steering angles of the wheels of the rover.
 * @param data The rover state data.
 * @returns The steering angles of the wheels in degrees.
 */
const getSteeringAngles = (data: any) => {
	if (!data || !data["navigation"]) {
		return [];
	}

	const wheels = data["navigation"]["wheels"];
	const angles = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		angles.push(Number(wheels[wheel]["steering_angle"]));
	}

	return angles;
};

/**
 * Return the current position goal
 * @param data the rover state data
 * @returns the current position goal, only x and y coordinates
 */
const getCurrentGoal = (data: any) => {
	if (!data || !data["navigation"]) {
		return { x: 0, y: 0 };
	}

	return {
		x: Number(data["navigation"]["state"]["current_goal"]["position"]["x"]),
		y: Number(data["navigation"]["state"]["current_goal"]["position"]["y"]),
	};
};

/**
 * Return the set of points representing the trajectory of the rover
 * @param data the rover state data
 * @returns array of object representing points. Only x and y coordinates
 */
const getTrajectory = (data: any) => {
	if (!data || !data["navigation"] || data["navigation"]["state"]["points"].length === 0) {
		return [{ x: 0, y: 0 }];
	}

	return data["navigation"]["state"]["points"].map(
		({ x, y, z }: { x: number; y: number; z: number }) => ({
			x,
			y,
		})
	);
};

/**
 * Get the angle of the pivot wheel of the rover.
 * @param data The rover state data.
 * @returns The angle of the pivot wheel in degrees.
 */
const getPivotAngle = (data: any) => {
	if (!data || !data["navigation"]) {
		return 0;
	}

	return Number(data["navigation"]["wheels"]["pivot"]["angle"]);
};

/**
 * Get the speeds of the wheels of the rover.
 * @param data The rover state data.
 * @returns The speeds of the wheels in m/s.
 */
const getWheelsDrivingValue = (data: any) => {
	if (!data || !data["navigation"]) {
		return [];
	}

	const wheels = data["navigation"]["wheels"];
	const values = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		values.push(Number(wheels[wheel]["speed"]));
	}

	return values;
};

/**
 * Get the current position of the rover.
 * @param data The rover state data.
 * @returns The position of the rover in meters.
 */
const getCurrentPosition = (data: any) => {
	if (!data || !data["navigation"]) {
		return { x: 0, y: 0 };
	}

	return {
		x: Number(data["navigation"]["localization"]["position"]["x"]),
		y: Number(data["navigation"]["localization"]["position"]["y"]),
	};
};

/**
 * Get the current orientation of the rover.
 * @param data The rover state data.
 * @returns The orientation of the rover in degrees.
 */
const getCurrentOrientation = (data: any) => {
	if (!data || !data["navigation"]) {
		return {x: 0, y: 0, z: 0}
	}

	return {
		x: Number(data["navigation"]["localization"]["orientation"]["x"]),
		y: Number(data["navigation"]["localization"]["orientation"]["y"]),
		z: Number(data["navigation"]["localization"]["orientation"]["z"])
	};

};


//////////////////////// HANDLING DEVICE ////////////////////////

/**
 * Get the positions of the joints of the handling device.
 * @param data The rover state data.
 * @returns The positions of the joints in degrees.
 */
const getJointsPositions = (data: any) => {
	if (!data || !data["handling_device"]) {
		return [];
	}

	const joints = data["handling_device"]["joints"];
	const positions = [];

	for (const joint in joints) {
		positions.push(Number(joints[joint]["angle"]));
	}

	return positions;
};

//////////////////////// ELECTRONICS ////////////////////////

const BATTERY_MAX_VOLTAGE = 29;
const BATTERY_MIN_VOLTAGE = 24;

/**
 * Get the battery level of the rover.
 * @param data The rover state data.
 * @returns The battery level of the rover in percentage.
 */
const getBatteryLevel = (data: any) => {
	if (!data || !data["electronics"]) {
		return 0;
	}

	return (
		(Number(data["electronics"]["power"]["voltage"]) -
			BATTERY_MIN_VOLTAGE / (BATTERY_MAX_VOLTAGE - BATTERY_MIN_VOLTAGE)) *
		100
	);
};

//////////////////////// DRILL ////////////////////////

/**
 * Return the drill encoder value
 * @param data the rover state data
 * @returns the drill encoder value [0, 30'000'000]
 */
const getDrillModule = (data: any) => {
	if (!data || !data["drill"] ) {
		return 0.0
	}

	return Number(data["drill"]["motors"]["motor_module"]["position"])
}

/**
 * Get the rotation of the drill screw.
 * @param data The rover state data.
 * @returns The rotation of the drill screw in degrees.
 */
const getDrillScrewRotation = (data: any) => {
	if (!data || !data["drill"]) {
		return 0;
	}

	return Number(data["drill"]["motors"]["motor_drill"]["speed"]);
};


export {
	getStateSystem,
	getJointsPositions,
	getSteeringAngles,
	getPivotAngle,
	getCurrentPosition,
	getCurrentOrientation,
	getDrillScrewRotation,
	getBatteryLevel,
	getdBm,
	getCurrentGoal,
	getTrajectory,
	getDrillModule,
	getWheelsDrivingValue,
	getWarnings,
	getErrors
};
