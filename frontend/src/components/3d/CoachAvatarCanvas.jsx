import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Float } from "@react-three/drei";
import * as THREE from "three";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";

function NeuralOrb() {
  const outerMesh = useRef();
  const innerMesh = useRef();

  const outerMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#00f2fe",
        transmission: 0.85,
        opacity: 0.95,
        metalness: 0.3,
        roughness: 0.1,
        ior: 1.4,
        thickness: 0.4,
      }),
    []
  );

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8a5cf6",
        emissive: "#8a5cf6",
        emissiveIntensity: 1.8,
        roughness: 0.3,
        wireframe: true,
      }),
    []
  );

  useFrame((_, delta) => {
    if (outerMesh.current) {
      outerMesh.current.rotation.y += delta * 0.6;
      outerMesh.current.rotation.z += delta * 0.25;
    }
    if (innerMesh.current) {
      innerMesh.current.rotation.x -= delta * 0.8;
      innerMesh.current.rotation.y -= delta * 0.7;
    }
  });

  return (
    <Float speed={3} rotationIntensity={0.8} floatIntensity={1.5}>
      <mesh ref={outerMesh} material={outerMaterial}>
        <icosahedronGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={innerMesh} material={innerMaterial}>
        <octahedronGeometry args={[0.5, 0]} />
      </mesh>
    </Float>
  );
}

export default function CoachAvatarCanvas({ size = 44, fallback }) {
  return (
    <ThreeErrorBoundary fallback={fallback}>
      <div style={{ width: size, height: size, flexShrink: 0, position: "relative" }}>
        <Canvas
          camera={{ position: [0, 0, 3], fov: 44 }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.8} />
          <pointLight position={[4, 4, 4]} intensity={15} color="#00f2fe" />
          <pointLight position={[-4, -4, 2]} intensity={12} color="#8a5cf6" />
          <Center>
            <NeuralOrb />
          </Center>
        </Canvas>
      </div>
    </ThreeErrorBoundary>
  );
}
