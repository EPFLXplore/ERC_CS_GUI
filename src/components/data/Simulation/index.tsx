// @ts-nocheck
import { Suspense, memo, useState, startTransition, useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Line, OrbitControls, Plane, useTexture } from "@react-three/drei";
import RobotVisual from "./RobotVisual";
import MarsYard from "../../../assets/images/MarsYard2024.png";
import Pin from "./Pin";
import { Point2D, Point3D } from "../../../data/point.type";
import Terrain3D from "./Terrain";
import { Vector3 } from "three";
import { map2DTo3D } from "../../../utils/mapUtils";

/**
 * Simulation component that renders the 3D visualization of the rover and the terrain
 * @param armJointAngles Array of angles of the arm joints
 * @param wheelsSpeed Array of speeds of the wheels
 * @param wheelsSteeringAngle Array of angles of the wheels
 * @param pivotAngle Angle of the pivot
 * @param point Current point of the pin
 * @param setPoint Function to set the point of the pin
 * @param roverPosition Position of the rover
 * @param roverRotation Rotation of the rover
 * @param currentTarget Current target point
 * @param plannedPath Array of points of the planned path
 * @param volumetric Boolean to determine if the visualization is volumetric (3D terrain)
 * @returns The 3D visualization of the rover and the terrain
 */
const Simulation = ({
	drill_value,
	armJointAngles,
	wheelsSpeed,
	wheelsSteeringAngle,
	wheelsDrivingValue,
	pivotAngle,
	point,
	setPoint,
	roverPosition,
	roverRotation,
	currentTarget,
	plannedPath,
	volumetric = false,
}: {
	drill_value: number;
	armJointAngles: number[];
	wheelsSpeed: number[];
	wheelsSteeringAngle: number[];
	wheelsDrivingValue: number[];
	pivotAngle: number;
	point: { x: number; y: number };
	setPoint: (point: Point2D) => void;
	roverPosition: Point2D;
	roverRotation: Point3D;
	currentTarget?: Point2D;
	plannedPath: Point2D[];
	volumetric?: boolean;
}) => {
	const terrainRef = useRef();

	useEffect(() => {
		document.addEventListener("webglcontextlost", (e) => console.log("LOST"));
	}, []);

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
				<Pin coordinates={point} terrainRef={terrainRef} />
				<RobotVisual
					drill_value={drill_value}
					armJointAngles={armJointAngles}
					wheelsSpeed={wheelsSpeed}
					wheelsSteeringAngle={wheelsSteeringAngle}
					wheelsDrivingValue={wheelsDrivingValue}
					pivotAngle={pivotAngle}
					position={roverPosition}
					rotation={roverRotation}
					terrainRef={terrainRef}
				/>
				{volumetric ? (
					<Terrain3D
						setPoint={setPoint}
						currentTarget={currentTarget}
						terrainRef={terrainRef}
					/>
				) : (
					<Terrain setPoint={setPoint} currentTarget={currentTarget} />
				)}
				<Line
					points={plannedPath.map(map2DTo3D).map((point) => [point.x, 0.13, point.z])}
					color={0xff4345}
					lineWidth={2}
				/>
			</Canvas>
		</Suspense>
	);
};

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
			position={[-15.7, -0.47, -3.3]}
			scale={0.55}
			receiveShadow
			traverseVisible={true}
			onClick={(e) => {
				if (e.delta < 2)
					startTransition(() => {
						setPoint({ x: e.point.x, y: e.point.z });
						console.log(e.point);
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

export default memo(Simulation);
