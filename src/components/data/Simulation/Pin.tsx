import { ReactNode, Ref, useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { Point2D } from "../../../data/point.type";
import { useThree } from "@react-three/fiber";
import { Object3D, Vector3 } from "three";

const Pin = ({
	coordinates,
	terrainRef,
}: {
	coordinates: Point2D;
	terrainRef: React.MutableRefObject<Object3D | undefined>;
}) => {
	const groupRef = useRef();
	//@ts-ignore
	const { nodes, materials } = useGLTF("/models/scene.gltf");
	const [pinMapPosition, setPinMapPosition] = useState({ x: 0, y: 0, z: 0 });
	const { raycaster } = useThree();

	useEffect(() => {
		if (terrainRef.current) {
			// Set raycaster from the rover's position downwards
			raycaster.set(new Vector3(coordinates.x, 10, coordinates.y), new Vector3(0, -1, 0));

			const intersects = raycaster.intersectObject(terrainRef.current);
			if (intersects.length > 0) {
				// Update rover's Y position based on intersection point
				setPinMapPosition({
					x: coordinates.x,
					y: intersects[0].point.y + 0.5,
					z: coordinates.y,
				});
			}
		} else {
			setPinMapPosition({ x: coordinates.x, y: 0, z: coordinates.y });
		}
	}, [terrainRef.current, coordinates]);

	return (
		<group
			ref={groupRef}
			dispose={null}
			scale={0.5}
			position={[pinMapPosition.x, pinMapPosition.y, pinMapPosition.z]}
		>
			<group scale={0.01}>
				<group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
					<mesh
						castShadow
						geometry={nodes["Map-Pin_Color_-_Red_Pin_0"].geometry}
						material={materials["Color_-_Red_Pin"]}
					/>
					<mesh
						castShadow
						geometry={nodes["Map-Pin_Color_-_Red_Ripple_0"].geometry}
						material={materials["Color_-_Red_Ripple"]}
					/>
				</group>
			</group>
		</group>
	);
};

useGLTF.preload("/models/scene.gltf");

export default Pin;
