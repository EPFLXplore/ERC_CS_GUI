// @ts-nocheck
import * as THREE from "three";
import { useRef, memo } from "react";
import { useLoader } from "@react-three/fiber";
import { Plane } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import URDFLoader from "urdf-loader";

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
}: {
	armJointAngles: number[];
	wheelsSpeed: number[];
	wheelsSteeringAngle: number[];
	pivotAngle: number;
}) => {
	var filepath = "/onyx_description/description/onyx.urdf"; // "/kerby_description/urdf/kerby_compiled.urdf"

	// loading robot model from urdf
	const ref = useRef();
	const robot = useLoader(URDFLoader, filepath, (loader) => {
		loader.loadMeshFunc = (path, manager, done) => {
			new STLLoader(manager).load(
				path,
				(result) => {
					const material = new THREE.MeshPhongMaterial();
					const mesh = new THREE.Mesh(result, material);
					done(mesh);
				},
				null,
				(err) => done(null, err)
			);
		};
		loader.fetchOptions = {
			headers: { Accept: "application/vnd.github.v3.raw" },
		};
	});

	// Set joint angles
	for (let i = 0; i < 6; i++) {
		robot.joints[`hd_joint${i + 1}`].setJointValue(THREE.MathUtils.degToRad(armJointAngles[i]));
	}

	// robot.joints[`finger1`].setJointValue(THREE.MathUtils.degToRad(armJointAngles[i]));

	// Set wheel steering angles
	for (let i = 0; i < wheelsSteeringAngle.length; i++) {
		robot.joints[`steering${i + 1}`].setJointValue(
			THREE.MathUtils.degToRad(wheelsSteeringAngle[i])
		);
	}

	// Set pivot angle
	robot.joints["right_pivot"].setJointValue(THREE.MathUtils.degToRad(pivotAngle));
	robot.joints["left_pivot"].setJointValue(THREE.MathUtils.degToRad(-pivotAngle));

	return (
		<group>
			<mesh
				castShadow
				receiveShadow
				position={[0, 0, 0]}
				rotation={[-0.5 * Math.PI, 0, 0]}
				scale={1}
			>
				<primitive
					ref={ref}
					object={robot}
					position={[0, 0, 0]}
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
