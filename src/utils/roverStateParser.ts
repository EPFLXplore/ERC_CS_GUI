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

const getPivotAngle = (data: any) => {
	if (!data["navigation"]) {
		return 0;
	}

	return data["navigation"]["wheels"]["pivot"]["angle"];
};

export { getJointsPositions, getWheelsSpeed, getSteeringAngles, getPivotAngle };
