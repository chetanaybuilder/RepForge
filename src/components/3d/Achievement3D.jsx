import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Float } from "@react-three/drei";
import * as THREE from "three";
import { isWebGLAvailable } from "../../utils/webgl";
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

function FallbackGem({ color = "#8a5cf6", active, size = 56 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "14px",
        background: active
          ? `radial-gradient(circle, ${color}33 0%, rgba(10,10,20,0.6) 70%)`
          : "rgba(255,255,255,0.03)",
        border: active ? `1px solid ${color}88` : "1px solid rgba(255,255,255,0.08)",
        boxShadow: active ? `0 0 16px ${color}44` : "none",
        fontSize: Math.round(size * 0.44),
        color: active ? color : "var(--rf-text-faint)",
      }}
    >
      {active ? "✦" : "◇"}
    </div>
  );
}

export function Achievement3D({ color = "#8a5cf6", active = true, size = 56 }) {
  if (!isWebGLAvailable()) {
    return <FallbackGem color={color} active={active} size={size} />;
  }

  return (
    <ThreeErrorBoundary fallback={<FallbackGem color={color} active={active} size={size} />}>
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
