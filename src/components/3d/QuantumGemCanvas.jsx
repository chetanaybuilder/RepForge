import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Float } from "@react-three/drei";
import * as THREE from "three";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";

function QuantumGem({ color = "#8a5cf6", active }) {
  const meshRef = useRef();

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: active ? color : "#242436",
        emissive: active ? color : "#0a0a14",
        emissiveIntensity: active ? 0.7 : 0,
        metalness: active ? 0.85 : 0.2,
        roughness: active ? 0.15 : 0.8,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      }),
    [color, active]
  );

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (active ? 0.7 : 0.15);
      meshRef.current.rotation.x += delta * (active ? 0.35 : 0.1);
    }
  });

  return (
    <Float speed={active ? 2.5 : 0.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} material={material}>
        <octahedronGeometry args={[1.4, 0]} />
      </mesh>
    </Float>
  );
}

export default function QuantumGemCanvas({ color = "#8a5cf6", active = true, size = 56, fallback }) {
  return (
    <ThreeErrorBoundary fallback={fallback}>
      <div style={{ width: size, height: size, cursor: "pointer", flexShrink: 0 }}>
        <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.6} />
          <pointLight position={[4, 4, 4]} intensity={25} color="#ffffff" distance={12} />
          <Center>
            <QuantumGem color={color} active={active} />
          </Center>
        </Canvas>
      </div>
    </ThreeErrorBoundary>
  );
}
