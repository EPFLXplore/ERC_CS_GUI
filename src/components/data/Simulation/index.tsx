// @ts-nocheck
import { Suspense, memo, useState, startTransition } from "react";
import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls, Plane, useTexture } from "@react-three/drei";
import RobotVisual from "./RobotVisual";
import MarsYard from "../../../assets/images/mars_yard_2023_2.png";
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
	const [point, setPoint] = useState({ x: -10, y: -10 });
	const [path, setPath] = useState([
		{
			x: 0,
			y: 0,
		},
		{
			x: -2,
			y: 0,
		},
		{
			x: -2,
			y: -2,
		},
		{
			x: -4,
			y: -5,
		},
		{
			x: -6,
			y: -5,
		},
		{
			x: -8,
			y: -7,
		},
		{
			x: -10,
			y: -10,
		},
	]);

	return (
		<Suspense fallback={null}>
			<Canvas
				colorManagement
				shadowMap
				shadows={{ type: "PCFSoftShadowMap" }}
				camera={{ position: [-1.7, 1, 1.0], fov: 63 }}
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
				<OrbitControls enableZoom={true} />
				<Pin coordinates={point} />
				<RobotVisual
					armJointAngles={armJointAngles}
					wheelsSpeed={wheelsSpeed}
					wheelsSteeringAngle={wheelsSteeringAngle}
					pivotAngle={pivotAngle}
				/>
				<Terrain setPoint={setPoint} />
				<Line points={path.map(mapPointToCoordinates)} color={0xff4345} lineWidth={2} />
			</Canvas>
		</Suspense>
	);
}

const Terrain = ({ setPoint }: { setPoint: ({ x: number, y: number }) => void }) => {
	const texture = useTexture(MarsYard);

	return (
		<Plane
			args={[50, 50]}
			rotation={[-Math.PI / 2, 0, Math.PI / 2]}
			position={[-22, -0.47, -3.2]}
			receiveShadow
			traverseVisible={true}
			onClick={(e) => {
				if (e.delta < 2)
					startTransition(() => {
						setPoint({ x: e.point.x, y: e.point.z });
					});
			}}
			onPointerUp={(e) => {
				// check right click
				if (e.button === 2 && e.delta < 2) {
					startTransition(() => {
						setPoint({ x: -10, y: -10 });
					});
				}
			}}
		>
			<meshStandardMaterial map={texture} opacity={0.9} side={2} />
		</Plane>
	);
};

const mapPointToCoordinates = (point: { x: number; y: number }) => {
	return [point.x, -0.2, point.y];
};

export default memo(Simulation);
