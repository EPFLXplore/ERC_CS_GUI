import { CameraType } from "../data/cameras.type";
import States from "../data/states.type";

/**
 * This file contains functions that parse the subsystem state data gotten from publishers in 
 * roverStateHooks.ts
 * With direct subsystem interface nodes, the data structure becomes:
 *
 *	roverState = {
 *		navigation: { ... },        // From /NAV/State (1 Hz)
 *		handling_device: { ... },   // From /HD/State (1 Hz)
 *		drill: { ... },            // From /DRILL/State (1 Hz)
 *		electronics: { ... },      // From /EL/State (1 Hz)
 *		rover: { ... }             // Optional: from aggregator
 *	}
 * 
 * 
 * @author Arno Laurie
 * @version 1.0
 */

import SubSystems from "../data/subsystems.type";


//////////////////////// HELPER: Graceful Access ////////////////////////

/**
 * Safely access subsystem data with fallback for old structure
 */
const getSubsystemData = (data: any, subsystem: string) => {
    // New structure: direct access
    if (data && data[subsystem]) {
        return data[subsystem];
    }
    
    // Old structure: wrapped in 'rover'
    if (data && data['rover'] && data['rover'][subsystem]) {
        return data['rover'][subsystem];
    }
    
    return null;
};

//////////////////////// GENERAL ////////////////////////

const getJetsonStatsHD = (data: any) => {
    // Try new structure first
    const roverData = data?.rover || data;
    
    if (!roverData || !roverData['hardware']) {
        return {
            ram: 0,
            load_gpu: 0,
            fan_rpm: 0,
            power_tot: 0,
            temp_cpu: 0,
            temp_gpu: 0,
            cpu_usage: [0, 0, 0, 0, 0, 0, 0, 0]
        }
    }

    const stats = roverData['hardware']['stats_hd']

    return {
        ram: stats['ram'] ?? 0,
        load_gpu: stats['load_gpu'] ?? 0,
        fan_rpm: stats['fan_rpm'] ?? 0,
        power_tot: stats['power_tot'] ?? 0,
        temp_cpu: stats['temp_cpu'] ?? 0,
        temp_gpu: stats['temp_gpu'] ?? 0,
        cpu_usage: stats['utilization_cpus'] ?? [0, 0, 0, 0, 0, 0, 0, 0],
    }
}


const getJetsonStatsNAV = (data: any) => {
    // Try new structure first
    const roverData = data?.rover || data;
    
    if (!roverData || !roverData['hardware']) {
        return {
            ram: 0,
            load_gpu: 0,
            fan_rpm: 0,
            power_tot: 0,
            temp_cpu: 0,
            temp_gpu: 0,
            cpu_usage: [0, 0, 0, 0, 0, 0, 0, 0]
        }
    }

    const stats = roverData['hardware']['stats_nav']

    return {
        ram: stats['ram'] ?? 0,
        load_gpu: stats['load_gpu'] ?? 0,
        fan_rpm: stats['fan_rpm'] ?? 0,
        power_tot: stats['power_tot'] ?? 0,
        temp_cpu: stats['temp_cpu'] ?? 0,
        temp_gpu: stats['temp_gpu'] ?? 0,
        cpu_usage: stats['utilization_cpus'] ?? [0, 0, 0, 0, 0, 0, 0, 0],
    }
}


const getNodes = (data: any) => {
	// In new architecture, each subsystem reports its own nodes
	// Aggregate nodes from all subsystems
	if (!data) {
		return "NO DATA";
	}

	const result: any[] = [];

	// Collect nodes from each subsystem
	const subsystems = ['navigation', 'handling_device', 'drill', 'electronics', 'rover'];
	
	for (const subsystem of subsystems) {
		if (data[subsystem]?.software?.nodes) {
			const nodes = data[subsystem].software.nodes;
			for (const nodeKey in nodes) {
				if (nodes.hasOwnProperty(nodeKey)) {
					result.push({
						name: nodes[nodeKey].name || nodeKey,
						status: nodes[nodeKey].status ? "Connected" : "Disconnected",
						subsystem: subsystem
					});
				}
			}
		}
	}

	// If no nodes found in new structure, check old structure for backwards compatibility
	if (result.length === 0 && data['rover']?.software?.nodes) {
		const nodes = data['rover'].software.nodes;
		for (const node in nodes) {
			result.push({
				name: nodes[node].name,
				status: nodes[node].status ? "Connected" : "Disconnected"
			});
		}
	}

	return result.length > 0 ? result : "NO DATA";
}


const getNetworkData = (data: any) => {
	const roverData = data?.rover || data;

	if (!roverData || !roverData['network']) {
		return "NO DATA";
	}

    if (Number(roverData['network']['signal_strength']) == 0.0) {
        return -40
    }

    return Number(roverData['network']['signal_strength'])
	
}


const getStateSystem = (data: any, system: SubSystems) => {
	if (!data || !data[system]) {
		return States.OFF; // Use States enum value: "Off"
	}

	return data[system]["state"]["mode"];
};

const getLogs = (data: any) => {
	if(!data || !data['rover']) {
		return [];
	}

	return data['rover']['network']['logs']
}


const getCameraStates = (data: any) => {
    let result: CameraType = {}
    
    // Helper function to transform camera data if needed
    const transformCameraData = (cameras: any) => {
        if (!cameras) return null;
        
        // If cameras is already an object with camera names as keys containing status/data_rate, return as-is
        // Otherwise, create the expected structure
        const transformed: any = {};
        
        for (const key in cameras) {
            if (cameras[key] && typeof cameras[key] === 'object') {
                // If it already has the expected structure
                if ('status' in cameras[key] || 'node' in cameras[key]) {
                    transformed[key] = cameras[key];
                } else {
                    // Transform if needed - provide defaults
                    transformed[key] = {
                        name: cameras[key].name || key,
                        status: cameras[key].status || false,
                        node: cameras[key].node || false,
                        data_rate: cameras[key].data_rate || "0"
                    };
                }
            }
        }
        
        return Object.keys(transformed).length > 0 ? transformed : null;
    };
    
    // Accept both new subsystem state shape and legacy aggregated camera maps.
    const getCameraSource = (subsystem: string) => {
        const subsystemState = data?.[subsystem];
        const legacyCameras = data?.cameras;

        return (
            subsystemState?.cameras ||
            subsystemState?.state?.cameras ||
            data?.rover?.cameras?.[subsystem] ||
            legacyCameras?.[subsystem] ||
            null
        );
    };

    result[SubSystems.NAGIVATION] = transformCameraData(getCameraSource(SubSystems.NAGIVATION));
    result[SubSystems.HANDLING_DEVICE] = transformCameraData(getCameraSource(SubSystems.HANDLING_DEVICE));
    result[SubSystems.ROVER] = transformCameraData(
        getCameraSource(SubSystems.ROVER) ||
        data?.electronics?.cameras ||
        data?.rover?.cameras
    );

    return result
}

//////////////////////// NAVIGATION ////////////////////////

const getLinearVelocity = (data: any) => {
    const navData = getSubsystemData(data, 'navigation');
    
    if (!navData || !navData['localization']) {
        return { x: "NO DATA", y: "NO DATA", z: "NO DATA" }
    }

    return {
        x: Number(navData['localization']['linear_velocity']['x']),
        y: Number(navData['localization']['linear_velocity']['y']),
        z: Number(navData['localization']['linear_velocity']['z']),
    }
}
const getAngularVelocity = (data: any) => {
	const navData = getSubsystemData(data, 'navigation');
	
	if (!navData || !navData['localization']) {
		return {
			x: "NO DATA",
			y: "NO DATA",
			z: "NO DATA"
		}
	}

	return {
		x: Number(navData['localization']['angular_velocity']['x']),
		y: Number(navData['localization']['angular_velocity']['y']),
		z: Number(navData['localization']['angular_velocity']['z']),
	}
};

const getCurrentDriving = (data: any) => {
    const navData = getSubsystemData(data, 'navigation');
    
    if (!navData || !navData['wheels']) {
        return [0, 0, 0, 0]
    }

    const wheels = navData['wheels'];
    const current = [];

    for (const wheel in wheels) {
        if (wheel === "pivot") continue;
        current.push(Number(wheels[wheel]["current_driving"]));
    }

    return current;
}


const getCurrentSteering = (data: any) => {
	const navData = getSubsystemData(data, 'navigation');
	
	if (!navData || !navData['wheels']) {
		return [0, 0, 0, 0]
	}

	const wheels = navData["wheels"];
	const current = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		current.push(Number(wheels[wheel]["current_steering"]));
	}

	return current;
}


const getSteeringState = (data: any) => {
	const navData = getSubsystemData(data, 'navigation');
	
	if (!navData || !navData['wheels']) {
		return ["NO DATA", "NO DATA", "NO DATA", "NO DATA"]
	}

	const wheels = navData["wheels"];
	const states = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		if(wheels[wheel]["steering_fault"]) {
			states.push("Fault!")
		} else {
			states.push(wheels[wheel]["steering_motor_state"] ? "Connected": "Disconnected");
		}
	}

	return states;
}

const getDrivingState = (data: any) => {
	const navData = getSubsystemData(data, 'navigation');
	
	if (!navData || !navData['wheels']) {
		return ["NO DATA", "NO DATA", "NO DATA", "NO DATA"]
	}

	const wheels = navData["wheels"];
	const states = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		if(wheels[wheel]["driving_fault"]) {
			states.push("Fault!")	
		} else {
			states.push(wheels[wheel]["driving_motor_state"] ? "Connected" : "Disconnected");
		}
	}

	return states;
}

/**
 * Get the steering angles of the wheels of the rover.
 * @param data The rover state data.
 * @returns The steering angles of the wheels in degrees.
 * 
 */
const getSteeringAngles = (data: any) => {
    const navData = getSubsystemData(data, 'navigation');
    
    if (!navData || !navData['wheels']) {
        return [0, 0, 0, 0];
    }

    const wheels = navData['wheels'];
    const angles = [];

    for (const wheel in wheels) {
        if (wheel === "pivot") continue;
        angles.push(Number(Number(wheels[wheel]["steering_angle"]).toFixed(2)));
    }

    return angles;
}

/**
 * Get the speeds of the wheels of the rover.
 * @param data The rover state data.
 * @returns The speeds of the wheels in m/s.
 * 
 */
const getWheelsDrivingValue = (data: any) => {
	const navData = getSubsystemData(data, 'navigation');
	
	if (!navData || !navData['wheels']) {
		return [0, 0, 0, 0];
	}

	const wheels = navData["wheels"];
	const values = [];

	for (const wheel in wheels) {
		if (wheel === "pivot") continue;
		values.push(Number(Number(wheels[wheel]["speed"]).toFixed(2)));
	}

	return values;
};


/**
 * Return the current position goal
 * @param data the rover state data
 * @returns the current position goal, only x and y coordinates
 */
const getCurrentGoal = (data: any) => {
	const navData = getSubsystemData(data, 'navigation');
	
	if (!navData || !navData['state']) {
		return { x: 0, y: 0 };
	}

	return {
		x: Number(navData["state"]["current_goal"]["position"]["x"]),
		y: Number(navData["state"]["current_goal"]["position"]["y"]),
	};
};

/**
 * Return the set of points representing the trajectory of the rover
 * @param data the rover state data
 * @returns array of object representing points. Only x and y coordinates
 */
const getTrajectory = (data: any) => {
	const navData = getSubsystemData(data, 'navigation');
	
	if (!navData || !navData['state'] || navData["state"]["points"].length === 0) {
		return [{ x: 0, y: 0 }];
	}

	return navData["state"]["points"].map(
		({ x, y, z }: { x: number; y: number; z: number }) => ({
			x,
			y,
		})
	);
};


/**
 * Get the current position of the rover.
 * @param data The rover state data.
 * @returns The position of the rover in meters.
 * 
 * THIS ONE RETURN NO "NO DATA" BECAUSE OF THE SIMULATION
 */
const getCurrentPosition = (data: any) => {
    const navData = getSubsystemData(data, 'navigation');
    
    if (!navData || !navData['localization']) {
        return { x: 0, y: 0 };
    }

    return {
        x: Number(navData['localization']['position']['x']),
        y: Number(navData['localization']['position']['y']),
    };
}
/**
 * Get the current orientation of the rover.
 * @param data The rover state data.
 * @returns The orientation of the rover in degrees.
 * 
 * THIS ONE RETURN NO "NO DATA" BECAUSE OF THE SIMULATION
 */
const getCurrentOrientation = (data: any) => {
	const navData = getSubsystemData(data, 'navigation');
	
	if (!navData || !navData['localization']) {
		return {x: 0, y: 0, z: 0}
	}

	return {
		x: Number(navData["localization"]["orientation"]["x"]),
		y: Number(navData["localization"]["orientation"]["y"]),
		z: Number(navData["localization"]["orientation"]["z"])
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
	const hdData = getSubsystemData(data, 'handling_device');
	
	if (!hdData || !hdData['joints']) {
		return [0, 0, 0, 0, 0, 0];
	}

	const joints = hdData["joints"];
	const positions = [];

	for (const joint in joints) {
		// HDS publishes position in radians (sensor_msgs/JointState); convert to degrees for display
		positions.push(Number(joints[joint]?.["position"] ?? 0) * (180 / Math.PI));
	}

	return positions;
};

const getJointsCurrent = (data: any) => {
	const hdData = getSubsystemData(data, 'handling_device');
	
	if (!hdData || !hdData['joints']) {
		return [0, 0, 0, 0, 0, 0, 0];
	}

	const joints = hdData["joints"];
	const currents = [];

	for (const joint in joints) {
		// HDS interface no longer provides current; velocity (rad/s) is shown instead
		currents.push(Number(joints[joint]?.["velocity"] ?? 0));
	}

	return currents;
};

const getTotalJointsCurrent = (data: any) => {
	return Math.round(getJointsCurrent(data).reduce((total, current) => total + current, 0));
};

const getJointsStates = (data: any) => {
	const hdData = getSubsystemData(data, 'handling_device');
	
	if (!hdData || !hdData['joints']) {
		return ["NO DATA", "NO DATA", "NO DATA", "NO DATA", "NO DATA", "NO DATA", "NO DATA"];
	}

	const joints = hdData["joints"];
	const states = [];

	for (const joint in joints) {
		// HDS interface (sensor_msgs/JointState) no longer provides mode_motor.
		// A joint entry with a position field means the motor is reporting telemetry.
		const hasData = joints[joint] != null && "position" in joints[joint];
		states.push(hasData ? "Connected" : "Disconnected");
	}

	return states;
};

const getTorqueGripper = (data: any) => {
	const hdData = getSubsystemData(data, 'handling_device');
	
	const gripperJoint = hdData?.['joints']?.['joint_7'] ?? hdData?.['joints']?.['gripper'];
	if (!hdData || !hdData['joints'] || !gripperJoint) {
		return "0"
	}

	// 0.00416: torque constant of motor
	// 243: gear ratio
	// 0.65: gearbox efficiency
	// 0.5: gripper external reduction
	// More accurate value for the torque of the gripper
	const factor_conversion_to_torque = 0.00416 * 243 * 0.65 * 0.5

	// HDS interface no longer provides current; torque estimate unavailable
	return (Number(gripperJoint["current"] ?? 0) * factor_conversion_to_torque).toFixed(2)
}

const getCurrentHDTask = (data: any) => {
	const hdData = getSubsystemData(data, 'handling_device');
	
	if (!hdData || !hdData['state']) {
		return "NO DATA"
	}

	return hdData['state']['task']
}

const getCurrentHDCommand = (data: any) => {
	const hdData = getSubsystemData(data, 'handling_device');
	
	if (!hdData || !hdData['state']) {
		return "NO DATA"
	}

	return hdData['state']['current_command']
}

//////////////////////// ELECTRONICS ////////////////////////

const BATTERY_MAX_VOLTAGE = 28.5;
const BATTERY_MIN_VOLTAGE = 24.0;

const getBatteryState = (data: any) => {
	const elData = getSubsystemData(data, 'electronics');
	
	if (!elData || !elData['power']) {
		return "NO DATA";
	}

	return elData["power"]["state"]
}

/**
 * Get the battery level of the rover.
 * @param data The rover state data.
 * @returns The battery level of the rover in percentage.
 */
const getBatteryLevel = (data: any) => {
	const elData = getSubsystemData(data, 'electronics');
	
	if (!elData || !elData['power'] || Number(elData["power"]["voltage"]) == 0) {
		return "NO DATA";
	}

	return (
		Math.round((Number(elData["power"]["voltage"]) -
			BATTERY_MIN_VOLTAGE) / (BATTERY_MAX_VOLTAGE - BATTERY_MIN_VOLTAGE) *
		100)
	);
};

/**
 * Get the battery level of the rover.
 * @param data The rover state data.
 * @returns The battery level of the rover in percentage.
 */
const getBatteryVoltage = (data: any) => {
	const elData = getSubsystemData(data, 'electronics');
	
	if (!elData || !elData['power']) {
		return "NO DATA";
	}

	return (Number(elData["power"]["voltage"])).toFixed(2)
};

const getCurrentOutput = (data: any) => {
	const elData = getSubsystemData(data, 'electronics');
	
	if (!elData || !elData['power']) {
		return 0;
	}

	return (Number(elData["power"]["current"])).toFixed(2)
};

const getMassArmSensor = (data: any) => {
	const elData = getSubsystemData(data, 'electronics');
	
	if (!elData || !elData['sensors']) {
		return "NO DATA"
	}

	return Number(elData['sensors']['mass_sensors']["mass_container"])
}

const getMassDrillSensor = (data: any) => {
	const elData = getSubsystemData(data, 'electronics');
	
	if (!elData || !elData['sensors']) {
		return "NO DATA"
	}
	return Number(elData['sensors']['mass_sensors']["mass_drill"])
}

const getForInOneSensor = (data: any) => {
	const elData = getSubsystemData(data, 'electronics');
	
	if (!elData || !elData['sensors']) {
		return {
			temperature: "NO DATA",
			humidity: "NO DATA",
			conductivity: "NO DATA",
			ph: "NO DATA"
		}
	}

	return {
		temperature: Number(elData['sensors']['four_in_one']['temperature']),
        humidity: Number(elData['sensors']['four_in_one']['humidity']),
        conductivity: Number(elData['sensors']['four_in_one']['conductivity']),
        ph: Number(elData['sensors']['four_in_one']['ph'])
	}
}

const getDustSensor = (data: any) => {
	const elData = getSubsystemData(data, 'electronics');
	
	if (!elData || !elData['sensors']) {
		return {
			pm1_0_std: "NO DATA",
			pm2_5_std: "NO DATA",
			pm10_std: "NO DATA",
			pm1_0_atm: "NO DATA",
			pm2_5_atm: "NO DATA",
			pm10_atm: "NO DATA",
			num_particles_0_3: "NO DATA",
			num_particles_0_5: "NO DATA",
			num_particles_1_0: "NO DATA",
			num_particles_2_5: "NO DATA",
			num_particles_5_0: "NO DATA",
			num_particles_10: "NO DATA"
		}
	}

	return {
		pm1_0_std: Number(elData['sensors']['dust_sensor']['pm1_0_std']),
		pm2_5_std: Number(elData['sensors']['dust_sensor']['pm2_5_std']),
		pm10_std: Number(elData['sensors']['dust_sensor']['pm10_std']),
		pm1_0_atm: Number(elData['sensors']['dust_sensor']['pm1_0_atm']),
		pm2_5_atm: Number(elData['sensors']['dust_sensor']['pm2_5_atm']),
		pm10_atm: Number(elData['sensors']['dust_sensor']['pm10_atm']),
		num_particles_0_3: Number(elData['sensors']['dust_sensor']['num_particles_0_3']),
		num_particles_0_5: Number(elData['sensors']['dust_sensor']['num_particles_0_5']),
		num_particles_1_0: Number(elData['sensors']['dust_sensor']['num_particles_1_0']),
		num_particles_2_5: Number(elData['sensors']['dust_sensor']['num_particles_2_5']),
		num_particles_5_0: Number(elData['sensors']['dust_sensor']['num_particles_5_0']),
		num_particles_10: Number(elData['sensors']['dust_sensor']['num_particles_10'])
	}
}

//////////////////////// DRILL ////////////////////////

const getMotorModule = (data: any) => {
	const drillData = getSubsystemData(data, 'drill');
	
	if (!drillData || !drillData['motors']) {
		return {
			position: 0,
			current: 0,
			state: "NO DATA"
		}
	}

	return {
		position: Number(Number(drillData['motors']['motor_module']['position']).toFixed(2)),
		current: Number(drillData['motors']['motor_module']['current']),
		state: drillData['motors']['motor_module']['state'] ? "Connected" : "Disconnected"
	}
}

const getMotorDrill = (data: any) => {
	const drillData = getSubsystemData(data, 'drill');
	
	if (!drillData || !drillData['motors']) {
		return {
			speed: 0,
			current: 0,
			state: "NO DATA"
		}
	}

	return {
		speed: Number(drillData['motors']['motor_drill']['speed']),
		current: Number(drillData['motors']['motor_drill']['current']),
		state: drillData['motors']['motor_drill']['state'] ? "Connected" : "Disconnected"
	}
}

const getStateFSM = (data: any) => {
	const drillData = getSubsystemData(data, 'drill');
	
	if (!drillData || !drillData['state']) {
		return "NO DATA"
	}

	return drillData['state']['state_fsm']
}

export {
	getStateSystem,
	getJointsPositions,
	getSteeringAngles,
	getCurrentPosition,
	getCurrentOrientation,
	getBatteryLevel,
	getCurrentGoal,
	getTrajectory,
	getWheelsDrivingValue,
	getLogs,
	getNetworkData,
	getCurrentDriving,
	getCurrentSteering,
	getMotorDrill,
	getCurrentOutput,
	getDrivingState,
	getSteeringState,
	getJointsStates,
	getJointsCurrent,
	getMotorModule,
	getNodes,
	getJetsonStatsHD,
	getJetsonStatsNAV,
	getLinearVelocity,
	getAngularVelocity,
	getStateFSM,
	getMassArmSensor,
	getMassDrillSensor,
	getDustSensor,
	getForInOneSensor,
	getCurrentHDCommand,
	getCurrentHDTask,
	getTotalJointsCurrent,
	getBatteryState,
	getTorqueGripper,
	getBatteryVoltage,
	getCameraStates
};
