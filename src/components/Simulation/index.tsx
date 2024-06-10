// @ts-nocheck
import { Suspense, memo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Plane } from "@react-three/drei";
import RobotVisual from "./RobotVisual";
import MarsYard from "../../assets/images/mars_yard_2023_2.png";
import { TextureLoader } from "three";
import Pin from "./Pin";

function Simulation({
	armJointAngles,
	wheelsSpeed,
	wheelsSteeringAngle,
	pivotAngle,
}: {
	armJointAngles: number[];
	wheelsSpeed: number[];
	wheelsSteeringAngle: number[];
	pivotAngle: number;
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
				<Pin coordinates={{ x: -10, y: -10 }} />
				<RobotVisual
					armJointAngles={armJointAngles}
					wheelsSpeed={wheelsSpeed}
					wheelsSteeringAngle={wheelsSteeringAngle}
					pivotAngle={pivotAngle}
				/>
			</Suspense>
			<Plane
				args={[50, 50]}
				rotation={[-Math.PI / 2, 0, Math.PI / 2]}
				position={[-22, -0.47, -3.2]}
				receiveShadow
				traverseVisible={true}
			>
				<meshStandardMaterial map={texture} opacity={0.9} side={2} />
			</Plane>
		</Canvas>
	);
}

export default memo(Simulation);
