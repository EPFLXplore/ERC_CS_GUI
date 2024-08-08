import { useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { ColorRepresentation, MeshStandardMaterial } from "three";

const Pin = ({
	coordinates,
	color,
}: {
	coordinates: { x: number; y: number };
	color?: ColorRepresentation;
}) => {
	const groupRef = useRef();
	//@ts-ignore
	const { nodes, materials } = useGLTF("/models/scene.gltf");
	return (
		<group
			ref={groupRef}
			dispose={null}
			scale={0.5}
			position={[coordinates.x, 0, coordinates.y]}
		>
			<group scale={0.01}>
				<group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
					<mesh
						castShadow
						geometry={nodes["Map-Pin_Color_-_Red_Pin_0"].geometry}
						material={
							color
								? new MeshStandardMaterial({ color: color })
								: materials["Color_-_Red_Pin"]
						}
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
