// @ts-nocheck
import * as THREE from "three";
import { useEffect, useState, useRef, memo, startTransition } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { Plane } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import URDFLoader from "urdf-loader";
import { Point2D, Point3D } from "../../../data/point.type";
import { Vector3 } from "three";
import { map2DTo3D } from "../../../utils/mapUtils";

/*
Reference coordinate frames for THREE.js and ROS.
Both coordinate systems are right handed so the URDF is instantiated without
frame transforms. The resulting model can be rotated to rectify the proper up,
right, and forward directions

THREE.js
   Y
   |
   |
   .-----X
 ／
Z

   Z
   |   Y
   | ／
   .-----X

ROS URDf
	   Z
	   |   X
	   | ／
 Y-----.

*/

const RobotVisual = ({
	drill_value,
	armJointAngles,
	wheelsSteeringAngle,
	wheelsDrivingValue,
	pivotAngle,
	position,
	rotation,
	terrainRef,
}: {
	drill_value: number;
	armJointAngles: number[];
	wheelsSteeringAngle: number[];
	wheelsDrivingValue: number[];
	pivotAngle: number;
	position: Point2D;
	rotation: Point3D;
	terrainRef: React.MutableRefObject<THREE.Object3D | undefined>;
}) => {
	//var filepath = "/onyx_description_2/urdf/onyx.urdf";
	var filepath = "/onyx_final_description/urdf/onyx_3.urdf";

	// loading robot model from urdf
	const ref = useRef();
	const [roverMapPosition, setRoverMapPosition] = useState({ x: 0, y: 0, z: 0 });
	const { raycaster } = useThree();

	const MIN_DRILL_ENCODER = 0.0
	const MAX_DRILL_ENCODER = 30000000.0
	const MIN_DRILL_STATE = 0.0
	const MAX_DRILL_STATE = -0.64

	const [currentAngle, setCurrentAngle] = useState([0.0, 0.0, 0.0, 0.0])

	const mapRangeDrill = (value: number): number => {
		return MIN_DRILL_STATE + (value - MIN_DRILL_ENCODER) * 
		((MAX_DRILL_STATE - MIN_DRILL_STATE) / (MAX_DRILL_ENCODER - MIN_DRILL_ENCODER));
	}

	let interval = false

	/**
	 * Convert a speed of wheel to an angle of rotation, using the fact that the rover state is updated each 10ms
	 * @param speed the speed
	 * @returns the angle of rotation
	 */
	const wheelsDrivingMotion = (speed: number): number => {
		return (0.01 / (0.27 * Math.PI)) * speed
	}

	const robot = useLoader(URDFLoader, filepath, (loader) => {
		loader.loadMeshFunc = (path, manager, done) => {
			console.log("Loading mesh", path);
			new STLLoader(manager).load(
				path,
				(result) => {
					const material = new THREE.MeshPhongMaterial();
					const mesh = new THREE.Mesh(result, material);
					done(mesh);
				},
				(progress) => {
					console.log(progress);
				},
				(err) => {
					console.error(err, "Failed to load mesh", path);
					done(null, err);
				}
			);
		};
		loader.fetchOptions = {
			headers: { Accept: "application/vnd.github.v3.raw" },
		};
	});

	/*
	useEffect(() => {

		interval = setInterval(() => {
			setCurrentAngle((old) => {
				let newStates = {...old}
				for(let i = 0; i < 4; i++) {
					newStates[i] = (newStates[i] + wheelsDrivingMotion(wheelsDrivingValue[i])) % 360
				}
				return newStates
			})
			console.log("défkvndfvref")

		}, 500)

		if(interval) {
			clearInterval(interval)
			console.log("CANCELED")
		}

	}, [wheelsDrivingValue])
	*/
	startTransition(() => {

		// Set joint angles
		const offsets = [180, -90, -90, 0, 0, -90]
		for (let i = 0; i < 6; i++) {
			robot.joints[`hd_joint_${i + 1}`].setJointValue(
				THREE.MathUtils.degToRad(armJointAngles[i] + offsets[i])
			);
		}
		// Set wheel steering angles
		for (let i = 0; i < wheelsSteeringAngle.length; i++) {
			robot.joints[`wheel_steering_${i + 1}`].setJointValue(
				THREE.MathUtils.degToRad(wheelsSteeringAngle[i] + (i > 1 ? 90 : -90))
			);
		}

		// Set wheel diving values
		for (let i = 0; i < wheelsDrivingValue.length; i++) {
			let angle = wheelsDrivingMotion(currentAngle[i])
			robot.joints[`wheel_driving_${i + 1}`].setJointValue(
				THREE.MathUtils.degToRad(currentAngle[i])
			);
		}

		// Set the drill depth value
		robot.joints[`drill_module`].setJointValue(mapRangeDrill(drill_value))

		// Set pivot angle
		robot.joints["pivot_right"].setJointValue(THREE.MathUtils.degToRad(pivotAngle));
		robot.joints["pivot_left"].setJointValue(THREE.MathUtils.degToRad(-pivotAngle));
	});

	useEffect(() => {
		const mapCoord = map2DTo3D(position);

		if (terrainRef.current) {
			// Set raycaster from the rover's position downwards
			raycaster.set(new Vector3(mapCoord.x, 10, mapCoord.z), new Vector3(0, -1, 0));

			const intersects = raycaster.intersectObject(terrainRef.current);
			if (intersects.length > 0) {
				// Update rover's Y position based on intersection point
				setRoverMapPosition({
					x: mapCoord.x,
					y: intersects[0].point.y + 0.5,
					z: mapCoord.z,
				});
			}
		} else {
			setRoverMapPosition(mapCoord);
		}
	}, [terrainRef.current, position]);

	return (
		<group>
			<mesh
				castShadow
				receiveShadow
				position={[roverMapPosition.x, roverMapPosition.y, roverMapPosition.z]}
				rotation={[rotation.x, rotation.y, rotation.z]}
				scale={1}
			>
				<primitive
					ref={ref}
					object={robot}
					position={[-0.35, -0.12, 0.25]}
					rotation={[-0.5 * Math.PI, 0, -Math.PI]}
					dispose={null}
					castShadow
				/>
			</mesh>
			<Plane
				receiveShadow
				rotation={[-Math.PI / 2, 0, 0]}
				//position={[0, -1, 0]}
				args={[1000, 1000]}
				scale={30}
			>
				<shadowMaterial opacity={0.25} />
			</Plane>
		</group>
	);
};

export default memo(RobotVisual);
