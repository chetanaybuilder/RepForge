import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Float } from "@react-three/drei";
import * as THREE from "three";
import { isWebGLAvailable } from "../../utils/webgl";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";

function Orb() {
  const meshRef = useRef();
  const innerRef = useRef();

  const outerMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#22d3ee",
        transmission: 0.9,
        opacity: 1,
        metalness: 0.2,
        roughness: 0.1,
        ior: 1.5,
        thickness: 0.5,
      }),
    []
  );

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8a5cf6",
        emissive: "#8a5cf6",
        emissiveIntensity: 2,
        roughness: 0.4,
      }),
    []
  );

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.z += delta * 0.2;
    }
    if (innerRef.current) {
      innerRef.current.rotation.x -= delta * 0.8;
      innerRef.current.rotation.y -= delta * 0.6;
    }
  });

  return (
    <Float speed={3} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} material={outerMaterial}>
        <icosahedronGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={innerRef} material={innerMaterial}>
        <octahedronGeometry args={[0.4, 0]} />
      </mesh>
    </Float>
  );
}

function FallbackAvatar({ size }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #22d3ee, #8a5cf6 70%, #6d47c7 100%)",
        boxShadow: "0 0 16px rgba(138, 92, 246, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: Math.max(12, Math.round(size * 0.38)),
        flexShrink: 0,
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      ◈
    </div>
  );
}

export function CoachAvatar3D({ size = 40 }) {
  if (!isWebGLAvailable()) {
    return <FallbackAvatar size={size} />;
  }

  return (
    <ThreeErrorBoundary fallback={<FallbackAvatar size={size} />}>
      <div style={{ width: size, height: size, flexShrink: 0 }}>
        <Canvas camera={{ position: [0, 0, 3], fov: 45 }} dpr={[1, 2]}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={10} color="#ffffff" />
          <Center>
            <Orb />
          </Center>
        </Canvas>
      </div>
    </ThreeErrorBoundary>
  );
}
