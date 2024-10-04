/**
 * This file contains functions that parse the rover state data and return the
 * values contained in the data.
 *
 * @author Ugo Balducci, Giovanni Ranieri
 * @version 1.0
 */

import SubSystems from "../data/subsystems.type";

//////////////////////// GENERAL ////////////////////////

const getMainProcesses = (data: any) => {
	if (!data || !data['rover']) {
		return [];
	}

	return data['rover']["software"]["main_processes"];
}

const getNetworkData = (data: any) => {
	if (!data || !data['rover']) {
		return ["NO DATA", "NO DATA", "NO DATA", []];
	}

	let devices_connected = ["No device connected"]
	if (data['rover']["network"]["connected_devices"].length != 0) {
		devices_connected = data['rover']["network"]["connected_devices"]
	}

	return {
		main_ip: data['rover']["network"]["ipv4"],
		main_mac: data['rover']["network"]["mac"],
		signal_strength: data['rover']["network"]["signal_strength"],
		devices: devices_connected
	}
}

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
// TO BE DELETED
const getdBm = (data: any) => {
	if (!data || !data["rover"]) {
		return 0.0;
	}

	return Number(data["rover"]["network"]["signal_strength"]);
};


//////////////////////// NAVIGATION ////////////////////////

const getGpsCoordinates = (data: any) => {
	if(!data || !data['rover']) {
		return {
			latitude: "NO DATA",
			longitude: "NO DATA",
			altitude: "NO DATA"
		}
	}

	return {
		latitude: Number(data['navigation']['localization']['gps_coordinates']['latitude']),
		longitude: Number(data['navigation']['localization']['gps_coordinates']['longitude']),
		altitude: Number(data['navigation']['localization']['gps_coordinates']['altitude']),
	}
}

const getLinearVelocity = (data: any) => {
	if(!data || !data['rover']) {
		return {
			x: "NO DATA",
			y: "NO DATA",
			z: "NO DATA"
		}
	}

	return {
		x: Number(data['navigation']['localization']['linear_velocity']['x']),
		y: Number(data['navigation']['localization']['linear_velocity']['y']),
		z: Number(data['navigation']['localization']['linear_velocity']['z']),
	}
}

const getAngularVelocity = (data: any) => {
	if(!data || !data['rover']) {
		return {
			x: "NO DATA",
			y: "NO DATA",
			z: "NO DATA"
		}
	}

	return {
		x: Number(data['navigation']['localization']['angular_velocity']['x']),
		y: Number(data['navigation']['localization']['angular_velocity']['y']),
		z: Number(data['navigation']['localization']['angular_velocity']['z']),
	}
}

const getSteeringState = (data: any) => {
	if(!data || !data['rover']) {
		return ["NO DATA", "NO DATA", "NO DATA", "NO DATA"]
	}

	const wheels = data["navigation"]["wheels"];
	const states = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		states.push("Connected" ? wheels[wheel]["steering_motor_state"] : "Not Connected");
	}

	return states;
}

const getDrivingState = (data: any) => {
	if(!data || !data['rover']) {
		return ["NO DATA", "NO DATA", "NO DATA", "NO DATA"]
	}

	const wheels = data["navigation"]["wheels"];
	const states = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		states.push("Connected" ? wheels[wheel]["driving_motor_state"] : "Not Connected");
	}

	return states;
}

/**
 * Get the steering angles of the wheels of the rover.
 * @param data The rover state data.
 * @returns The steering angles of the wheels in degrees.
 * 
 * THIS ONE RETURN NO "NO DATA" BECAUSE OF THE SIMULATION
 */
const getSteeringAngles = (data: any) => {
	if (!data || !data["navigation"]) {
		return [0, 0, 0, 0];
	}

	const wheels = data["navigation"]["wheels"];
	const angles = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		angles.push(Number(wheels[wheel]["steering_angle"]));
	}

	return angles;
};

const getDistanceToGoal = (data: any) => {
	if(!data || !data['rover']) {
		return "NO DATA"
	}

	return Number(data['navigation']['state']['distance_to_goal'])
}

// TODO GET OBSTACLES

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
 * 
 * THIS ONE RETURN NO "NO DATA" BECAUSE OF THE SIMULATION
 */
const getPivotAngle = (data: any) => {
	if (!data || !data["navigation"]) {
		return 0.0;
	}

	return Number(data["navigation"]["wheels"]["pivot"]["angle"]);
};

/**
 * Get the speeds of the wheels of the rover.
 * @param data The rover state data.
 * @returns The speeds of the wheels in m/s.
 * 
 * THIS ONE RETURN NO "NO DATA" BECAUSE OF THE SIMULATION
 */
const getWheelsDrivingValue = (data: any) => {
	if (!data || !data["navigation"]) {
		return [0, 0, 0, 0];
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
 * 
 * THIS ONE RETURN NO "NO DATA" BECAUSE OF THE SIMULATION
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
 * 
 * THIS ONE RETURN NO "NO DATA" BECAUSE OF THE SIMULATION
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
 * 
 * THIS ONE RETURN NO "NO DATA" BECAUSE OF THE SIMULATION
 */
const getJointsPositions = (data: any) => {
	if (!data || !data["handling_device"]) {
		return [90, 90, 90, 0, 0, 0];
	}

	const joints = data["handling_device"]["joints"];
	const positions = [];

	for (const joint in joints) {
		positions.push(Number(joints[joint]["angle"]));
	}

	return positions;
};

const getJointsCurrent = (data: any) => {
	if (!data || !data["handling_device"]) {
		return ["NO DATA", "NO DATA", "NO DATA", "NO DATA", "NO DATA", "NO DATA"];
	}

	const joints = data["handling_device"]["joints"];
	const currents = [];

	for (const joint in joints) {
		currents.push(Number(joints[joint]["current"]));
	}

	return currents;
};

const getJointsStates = (data: any) => {
	if (!data || !data["handling_device"]) {
		return ["NO DATA", "NO DATA", "NO DATA", "NO DATA", "NO DATA", "NO DATA"];
	}

	const joints = data["handling_device"]["joints"];
	const states = [];

	for (const joint in joints) {
		states.push("Connected" ? joints[joint]["states"] : "Not connected");
	}

	return states;
};

const getGripperPosition = (data: any) => {
	if(!data || !data['rover']) {
		return {
			x: 0, y: 0, z: 0
		}
	}

	return {
		x: Number(data['handling_device']['gripper']['position']['x']),
		y: Number(data['handling_device']['gripper']['position']['y']),
		z: Number(data['handling_device']['gripper']['position']['z'])
	}
};

const getAngleGripper = (data: any) => {
	if(!data || !data['rover']) {
		return "NO DATA"
	}

	return Number(data['handling_device']['gripper']['angle'])
}

const getTorqueGripper = (data: any) => {
	if(!data || !data['rover']) {
		return "NO DATA"
	}

	return Number(data['handling_device']['gripper']['torque'])
}

// TODO VISION


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
		return "NO DATA";
	}

	return (
		(Number(data["electronics"]["power"]["voltage"]) -
			BATTERY_MIN_VOLTAGE / (BATTERY_MAX_VOLTAGE - BATTERY_MIN_VOLTAGE)) *
		100
	);
};

const getCurrentOutput = (data: any) => {
	if (!data || !data["electronics"]) {
		return "NO DATA";
	}

	return Number(data["electronics"]["power"]["current"])
};

//////////////////////// DRILL ////////////////////////

/**
 * Return the drill encoder value
 * @param data the rover state data
 * @returns the drill encoder value [0, 30'000'000]
 * 
 * THIS ONE RETURN NO "NO DATA" BECAUSE OF THE SIMULATION
 */
// TO BE DELETED
const getDrillModule = (data: any) => {
	if (!data || !data["drill"] ) {
		return 0.0
	}

	return Number(data["drill"]["motors"]["motor_module"]["position"])
}

const getModuleMotor = (data: any) => {
	if(!data || !data['rover']) {
		return {
			position: 0.0,
			current: "NO DATA",
			state: "NO DATA"
		}
	}

	return {
		position: Number(data['drill']['motors']['motor_module']['postition']),
		current: Number(data['drill']['motors']['motor_module']['current']),
		state: "Connected" ? data['drill']['motors']['motor_module']['state'] : "Not Connected"
	}
}

const getMotorDrill = (data: any) => {
	if(!data || !data['rover']) {
		return {
			speed: "NO DATA",
			current: "NO DATA",
			state: "NO DATA"
		}
	}

	return {
		speed: Number(data['drill']['motors']['motor_module']['speed']),
		current: Number(data['drill']['motors']['motor_module']['current']),
		state: "Connected" ? data['drill']['motors']['motor_module']['state'] : "Not Connected"
	}
}

/**
 * Get the rotation of the drill screw.
 * @param data The rover state data.
 * @returns The rotation of the drill screw in degrees.
 */
// TO BE DELETED
const getDrillScrewRotation = (data: any) => {
	if (!data || !data["drill"]) {
		return "NO DATA"
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
	getErrors,
	getNetworkData};
