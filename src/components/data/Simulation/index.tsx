// @ts-nocheck
import { Suspense, memo, useState, startTransition, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls, Plane, useFBX, useTexture } from "@react-three/drei";
import RobotVisual from "./RobotVisual";
import MarsYard from "../../../assets/images/MarsYard2024.png";
import Pin from "./Pin";
import { Point2D } from "../../../data/point.type";
import Terrain3D from "./Terrain";

function Simulation({
	armJointAngles,
	wheelsSpeed,
	wheelsSteeringAngle,
	pivotAngle,
	point,
	setPoint,
	currentTarget,
}: {
	armJointAngles: number[];
	wheelsSpeed: number[];
	wheelsSteeringAngle: number[];
	pivotAngle: number;
	point: { x: number; y: number };
	setPoint: (point: Point2D) => void;
	currentTarget?: { x: number; y: number };
}) {
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
				<Terrain3D setPoint={setPoint} currentTarget={currentTarget} />
				<Line points={path.map(mapPointToCoordinates)} color={0xff4345} lineWidth={2} />
			</Canvas>
		</Suspense>
	);
}

const Terrain = ({
	setPoint,
	currentTarget,
}: {
	setPoint: (point: Point2D) => void;
	currentTarget?: Point2D;
}) => {
	const texture = useTexture(MarsYard);

	return (
		<Plane
			args={[89, 50]}
			rotation={[-Math.PI / 2, 0, 0]}
			// y, z, x of MarsYard
			position={[-21.9, -0.47, -3.2]}
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
				if (e.button === 2 && e.delta < 2 && currentTarget) {
					startTransition(() => {
						setPoint(currentTarget);
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
