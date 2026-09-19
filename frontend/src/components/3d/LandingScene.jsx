import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles, Stars, Float } from "@react-three/drei";
import * as THREE from "three";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";
import { isWebGLAvailable } from "../../utils/webgl";

function AbstractCenterpiece() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#8a5cf6",
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        wireframe: true,
      }),
    []
  );

  const solidMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#22d3ee",
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      }),
    []
  );

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
      <group ref={meshRef} position={[0, 0, 0]} scale={1.2}>
        <mesh material={material}>
          <torusKnotGeometry args={[1, 0.3, 128, 16]} />
        </mesh>
        <mesh material={solidMaterial} scale={0.98}>
          <torusKnotGeometry args={[1, 0.28, 64, 16]} />
        </mesh>
      </group>
    </Float>
  );
}

function Scene() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const initialCamPos = useRef(new THREE.Vector3(0, 0, 7));

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    const targetX = initialCamPos.current.x + mouse.current.x * 2;
    const targetY = initialCamPos.current.y + mouse.current.y * 2;

    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 5]} color="#22d3ee" intensity={150} distance={20} />
      <pointLight position={[-10, -10, 5]} color="#8a5cf6" intensity={150} distance={20} />
      <spotLight position={[0, 5, 8]} angle={0.4} penumbra={1} intensity={100} color="#ffffff" distance={20} />

      <Stars radius={50} depth={50} count={2500} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={80} scale={15} size={3} speed={0.4} opacity={0.4} color="#8a5cf6" />
      <Sparkles count={80} scale={15} size={3} speed={0.5} opacity={0.4} color="#22d3ee" />

      <AbstractCenterpiece />
    </>
  );
}

export default function LandingScene() {
  if (!isWebGLAvailable()) return null;

  return (
    <ThreeErrorBoundary fallback={null}>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}>
        <Canvas camera={{ position: [0, 0, 7], fov: 50 }} dpr={[1, 2]} gl={{ alpha: true }}>
          <Scene />
        </Canvas>
      </div>
    </ThreeErrorBoundary>
  );
}
