import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import * as THREE from "three";
import { isWebGLAvailable } from "../../utils/webgl";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";

function Plate({ position, delay = 0 }) {
  const meshRef = useRef();

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8a5cf6",
        metalness: 0.8,
        roughness: 0.2,
      }),
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    meshRef.current.position.y = position[1] + Math.sin(t * 5 + delay) * 0.2;
    meshRef.current.rotation.z = Math.sin(t * 3 + delay) * 0.1;
  });

  return (
    <mesh ref={meshRef} position={position} material={material}>
      <cylinderGeometry args={[1, 1, 0.4, 16]} />
    </mesh>
  );
}

function FallbackTyping() {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center", padding: "8px 12px" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#8a5cf6", display: "inline-block", animation: "rf-pulse 1.4s infinite ease-in-out" }} />
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22d3ee", display: "inline-block", animation: "rf-pulse 1.4s infinite ease-in-out 0.2s" }} />
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff6b45", display: "inline-block", animation: "rf-pulse 1.4s infinite ease-in-out 0.4s" }} />
    </div>
  );
}

export function TypingIndicator3D() {
  if (!isWebGLAvailable()) {
    return <FallbackTyping />;
  }

  return (
    <ThreeErrorBoundary fallback={<FallbackTyping />}>
      <div style={{ width: 60, height: 40, flexShrink: 0 }}>
        <Canvas camera={{ position: [0, 2, 5], fov: 40 }} dpr={[1, 2]}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={10} color="#22d3ee" />
          <Center>
            <group rotation={[0.4, 0, 0]}>
              <Plate position={[-1.2, 0, 0]} delay={0} />
              <Plate position={[0, 0, 0]} delay={0.4} />
              <Plate position={[1.2, 0, 0]} delay={0.8} />
            </group>
          </Center>
        </Canvas>
      </div>
    </ThreeErrorBoundary>
  );
}
