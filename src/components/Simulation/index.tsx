// @ts-nocheck
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Plane } from "@react-three/drei";
import RobotVisual from "./RobotVisual";
import MarsYard from "../../assets/images/mars_yard_2023_2.png";
import { TextureLoader } from "three";

function Simulation({
	armJointAngles,
	wheelsSpeed,
	wheelsSteeringAngle,
}: {
	armJointAngles: number[];
	wheelsSpeed: number[];
	wheelsSteeringAngle: number[];
}) {
	const textureLoader = new TextureLoader();
	const texture = textureLoader.load(MarsYard);

	return (
		<Canvas
			colorManagement
			shadowMap
			shadows={{ type: "PCFSoftShadowMap" }}
			camera={{ position: [-1.7, 1, 1.0], fov: 40 }}
			style={{ borderRadius: "10px" }}
		>
			<directionalLight
				castShadow
				intensity={1}
				color={0xffffff}
				position={[5, 30, 5]}
				shadow-mapSize-width={1024}
				shadow-mapSize-height={1024}
			/>
			<ambientLight intensity={0.2} color={0xffffff} />
			<Suspense fallback={null}>
				<OrbitControls enableZoom={true} />
				<RobotVisual
					armJointAngles={armJointAngles}
					wheelsSpeed={wheelsSpeed}
					wheelsSteeringAngle={wheelsSteeringAngle}
				/>
			</Suspense>
			<Plane
				args={[50, 50]}
				rotation={[-Math.PI / 2, 0, Math.PI / 2]}
				position={[-22, -0.47, -3.2]}
				receiveShadow
			>
				<meshStandardMaterial map={texture} opacity={0.9} />
			</Plane>
		</Canvas>
	);
}

export default Simulation;
