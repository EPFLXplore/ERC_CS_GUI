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
	armJointAngles,
	wheelsSteeringAngle,
	pivotAngle,
	position,
	rotation,
	terrainRef,
}: {
	armJointAngles: number[];
	wheelsSpeed: number[];
	wheelsSteeringAngle: number[];
	pivotAngle: number;
	position: Point2D;
	rotation: Point3D;
	terrainRef: React.MutableRefObject<THREE.Object3D | undefined>;
}) => {
	// var filepath = "/kerby_description/urdf/kerby_compiled.urdf";
	// var filepath = "/onyx_description/description/onyx.urdf";
	var filepath = "/onyx_description_2/urdf/onyx.urdf";

	// loading robot model from urdf
	const ref = useRef();
	const [roverMapPosition, setRoverMapPosition] = useState({ x: 0, y: 0, z: 0 });
	const { raycaster } = useThree();

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

	startTransition(() => {
		// Set joint angles
		for (let i = 0; i < 6; i++) {
			robot.joints[`hd_joint_${i + 1}`].setJointValue(
				THREE.MathUtils.degToRad(armJointAngles[i])
			);
		}
		// robot.joints[`finger1`].setJointValue(THREE.MathUtils.degToRad(armJointAngles[i]));
		// Set wheel steering angles
		for (let i = 0; i < wheelsSteeringAngle.length; i++) {
			robot.joints[`wheel_steering_${i + 1}`].setJointValue(
				THREE.MathUtils.degToRad(wheelsSteeringAngle[i] + (i > 1 ? 90 : -90))
			);
		}
		// // Set pivot angle
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
