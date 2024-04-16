// @ts-nocheck
import * as THREE from "three";
import React, { useRef } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { Plane } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import URDFLoader, { URDFRobot } from "urdf-loader";

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

const isJoint = (j) => {
	return j.isURDFJoint && j.jointType !== "fixed";
};

const RobotVisual = ({
	armJointAngles,
	wheelsSpeed,
	wheelsSteeringAngle,
}: {
	armJointAngles: number[];
	wheelsSpeed: number[];
	wheelsSteeringAngle: number[];
}) => {
	var filepath = "/kerby_description/urdf/kerby_compiled.urdf";

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

	//console.log(robot);

	// Set joint angles
	for (let i = 0; i < armJointAngles.length; i++) {
		robot.joints[`joint${i + 1}`].setJointValue(THREE.MathUtils.degToRad(armJointAngles[i]));
	}

	// Set wheel steering angles
	for (let i = 0; i < wheelsSteeringAngle.length; i++) {
		robot.joints[`steering${i + 1}`].setJointValue(
			THREE.MathUtils.degToRad(wheelsSteeringAngle[i])
		);
	}

	/*robot.joints["shoulder_pan_joint"].setJointValue(THREE.MathUtils.degToRad(0));
  robot.joints["shoulder_lift_joint"].setJointValue(
    THREE.MathUtils.degToRad(-60)
  );
  robot.joints["elbow_joint"].setJointValue(THREE.MathUtils.degToRad(60));
  robot.joints["wrist_1_joint"].setJointValue(THREE.MathUtils.degToRad(-90));
  robot.joints["wrist_2_joint"].setJointValue(THREE.MathUtils.degToRad(-90));
  robot.joints["wrist_3_joint"].setJointValue(THREE.MathUtils.degToRad(0));*/
	// const robot = useLoader(URDFLoader, robot_urdf);

	// The highlight material
	const highlightMaterial = new THREE.MeshPhongMaterial({
		shininess: 10,
		color: "#FFFFFF",
		emissive: "#FFFFFF",
		emissiveIntensity: 0.25,
	});

	// Highlight the link geometry under a joint
	const highlightLinkGeometry = (m, revert) => {
		const traverse = (c) => {
			// Set or revert the highlight color
			if (c.type === "Mesh") {
				if (revert) {
					c.material = c.__origMaterial;
					delete c.__origMaterial;
				} else {
					c.__origMaterial = c.material;
					c.material = highlightMaterial;
				}
			}

			// Look into the children and stop if the next child is
			// another joint
			if (c === m || !isJoint(c)) {
				for (let i = 0; i < c.children.length; i++) {
					traverse(c.children[i]);
				}
			}
		};
		traverse(m);
	};

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

export default RobotVisual;
