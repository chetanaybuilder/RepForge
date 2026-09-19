import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Float } from "@react-three/drei";
import * as THREE from "three";
import { isWebGLAvailable } from "../../utils/webgl";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";

function RotatingGem({ color = "#8a5cf6", active }) {
  const meshRef = useRef();

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: active ? color : "#333333",
        metalness: active ? 0.8 : 0.2,
        roughness: active ? 0.2 : 0.8,
        emissive: active ? color : "#000000",
        emissiveIntensity: active ? 0.5 : 0,
      }),
    [color, active]
  );

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (active ? 0.8 : 0.2);
      meshRef.current.rotation.x += delta * (active ? 0.4 : 0.1);
    }
  });

  return (
    <Float speed={active ? 2 : 0.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} material={material}>
        <octahedronGeometry args={[1.5, 0]} />
      </mesh>
    </Float>
  );
}

function FallbackGem({ color = "#8a5cf6", active, size = 64 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "14px",
        background: active ? `radial-gradient(circle, ${color}22 0%, rgba(0,0,0,0.3) 70%)` : "rgba(255,255,255,0.03)",
        border: active ? `1px solid ${color}66` : "1px solid rgba(255,255,255,0.08)",
        boxShadow: active ? `0 0 16px ${color}33` : "none",
        fontSize: Math.round(size * 0.42),
      }}
    >
      {active ? "✦" : "◇"}
    </div>
  );
}

export function Achievement3D({ color = "#8a5cf6", active = true, size = 64 }) {
  if (!isWebGLAvailable()) {
    return <FallbackGem color={color} active={active} size={size} />;
  }

  return (
    <ThreeErrorBoundary fallback={<FallbackGem color={color} active={active} size={size} />}>
      <div style={{ width: size, height: size, cursor: "pointer" }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={50} color="#ffffff" distance={15} />
          <Center>
            <RotatingGem color={color} active={active} />
          </Center>
        </Canvas>
      </div>
    </ThreeErrorBoundary>
  );
}
