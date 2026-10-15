/**
 * RepForge 2040 - 3D Dashboard Hero Hologram
 *
 * Responsibilities:
 * - Spatial strength core representing the lifter's cumulative mechanical volume.
 * - Interactive pointer parallax with spring-damped camera tracking.
 * - Dynamic kinetic rings with rotating milestones and volumetric sparkle telemetry.
 * - High-efficiency WebGL rendering with automatic DPR clamping and low-power preference.
 */

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";
import { DashboardHero2D } from "./DashboardHero2D";

/**
 * Procedural Kinetic Strength Dynamo with rotating quantum rings.
 *
 * @param {{ tier: 'high' | 'medium' | 'low' }} props
 */
function KineticDynamo({ tier = "high" }) {
  const groupRef = useRef();
  const innerNucleus = useRef();
  const ringAlpha = useRef();
  const ringBeta = useRef();

  const isLowTier = tier === "low";

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
    if (innerNucleus.current) {
      innerNucleus.current.rotation.x -= delta * 0.35;
      innerNucleus.current.rotation.z += delta * 0.25;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.0) * 0.04;
      innerNucleus.current.scale.set(pulse, pulse, pulse);
    }
    if (ringAlpha.current) {
      ringAlpha.current.rotation.x += delta * 0.5;
      ringAlpha.current.rotation.y += delta * 0.3;
    }
    if (ringBeta.current) {
      ringBeta.current.rotation.y -= delta * 0.4;
      ringBeta.current.rotation.z += delta * 0.35;
    }
  });

  const nucleusMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#00f2fe",
        emissive: "#0284c7",
        emissiveIntensity: 0.9,
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      }),
    []
  );

  const ringMaterialAlpha = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8a5cf6",
        emissive: "#7c3aed",
        emissiveIntensity: 1.4,
        metalness: 0.9,
        roughness: 0.15,
        wireframe: true,
      }),
    []
  );

  const ringMaterialBeta = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ff3366",
        emissive: "#e11d48",
        emissiveIntensity: 1.2,
        metalness: 0.85,
        roughness: 0.2,
        wireframe: true,
      }),
    []
  );

  return (
    <Float speed={2.4} rotationIntensity={0.5} floatIntensity={1.0}>
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Core Icosahedron Nucleus */}
        <mesh ref={innerNucleus} material={nucleusMaterial}>
          <icosahedronGeometry args={[1.05, isLowTier ? 1 : 2]} />
        </mesh>

        {/* Outer Kinetic Ring Alpha */}
        <mesh ref={ringAlpha} material={ringMaterialAlpha}>
          <torusGeometry args={[1.75, 0.035, 16, isLowTier ? 32 : 64]} />
        </mesh>

        {/* Cross Kinetic Ring Beta */}
        <mesh ref={ringBeta} material={ringMaterialBeta}>
          <torusGeometry args={[2.1, 0.025, 16, isLowTier ? 32 : 64]} />
        </mesh>
      </group>
    </Float>
  );
}

/**
 * Camera Parallax & Lighting Rig
 */
function HeroScene({ tier }) {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => {
      if (e.pointerType === "touch") return;
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  useFrame(() => {
    const targetX = mouse.current.x * 0.6;
    const targetY = mouse.current.y * 0.4;
    camera.position.x += (targetX - camera.position.x) * 0.04;
    camera.position.y += (targetY - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  const sparkleCount = tier === "low" ? 20 : 50;

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 6, 6]} color="#00f2fe" intensity={60} distance={16} />
      <pointLight position={[-6, -6, 4]} color="#8a5cf6" intensity={50} distance={16} />
      <pointLight position={[0, -4, -4]} color="#ff3366" intensity={40} distance={12} />

      <Sparkles
        count={sparkleCount}
        scale={8}
        size={tier === "low" ? 1.8 : 2.5}
        speed={0.4}
        opacity={0.35}
        color="#00f2fe"
      />
      <Sparkles
        count={Math.round(sparkleCount * 0.7)}
        scale={10}
        size={tier === "low" ? 1.8 : 2.5}
        speed={0.3}
        opacity={0.3}
        color="#8a5cf6"
      />

      <KineticDynamo tier={tier} />
    </>
  );
}

/**
 * Dashboard Hero 3D Component with lazy loading support and fallback.
 *
 * @param {{ tier?: 'high' | 'medium' | 'low' }} props
 */
export default function DashboardHero3D({ tier = "high" }) {
  return (
    <ThreeErrorBoundary fallback={<DashboardHero2D />}>
      <div
        className="rf-dashboard-hero-3d"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 5.8], fov: 46 }}
          dpr={typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 1.5) : 1}
          gl={{
            alpha: true,
            antialias: tier !== "low",
            powerPreference: tier === "low" ? "low-power" : "high-performance",
          }}
        >
          <HeroScene tier={tier} />
        </Canvas>
      </div>
    </ThreeErrorBoundary>
  );
}
