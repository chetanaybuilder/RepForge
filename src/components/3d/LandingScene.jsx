import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles, Float } from "@react-three/drei";
import * as THREE from "three";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";
import { isWebGLAvailable } from "../../utils/webgl";

/**
 * Biometric Neural Core: Central 2040 Biomechanical Intelligence Nucleus
 */
function BiometricCore({ isMobile }) {
  const coreGroup = useRef();
  const ring1 = useRef();
  const ring2 = useRef();
  const nucleus = useRef();

  useFrame((state, delta) => {
    if (coreGroup.current) {
      coreGroup.current.rotation.y += delta * 0.25;
    }
    if (ring1.current) {
      ring1.current.rotation.x += delta * 0.45;
      ring1.current.rotation.z += delta * 0.3;
    }
    if (ring2.current) {
      ring2.current.rotation.y -= delta * 0.5;
      ring2.current.rotation.x -= delta * 0.25;
    }
    if (nucleus.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.06;
      nucleus.current.scale.set(pulse, pulse, pulse);
    }
  });

  // Materials with high visual contrast
  const nucleusMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#00f2fe",
        emissive: "#0284c7",
        emissiveIntensity: 0.8,
        metalness: 0.85,
        roughness: 0.15,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        wireframe: false,
      }),
    []
  );

  const ring1Material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8a5cf6",
        emissive: "#6d28d9",
        emissiveIntensity: 1.2,
        metalness: 0.9,
        roughness: 0.2,
        wireframe: true,
      }),
    []
  );

  const ring2Material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ff3366",
        emissive: "#ff0055",
        emissiveIntensity: 0.9,
        metalness: 0.8,
        roughness: 0.3,
        wireframe: true,
      }),
    []
  );

  const scale = isMobile ? 1.0 : 1.35;

  return (
    <Float speed={2.5} rotationIntensity={0.6} floatIntensity={1.2}>
      <group ref={coreGroup} scale={scale} position={[0, 0, 0]}>
        {/* Central Crystalline Nucleus */}
        <mesh ref={nucleus} material={nucleusMaterial}>
          <icosahedronGeometry args={[1, isMobile ? 1 : 2]} />
        </mesh>

        {/* Orbiting Quantum Ring 1 (Toroidal Arc) */}
        <mesh ref={ring1} material={ring1Material}>
          <torusGeometry args={[1.7, 0.04, 16, isMobile ? 32 : 64]} />
        </mesh>

        {/* Orbiting Kinetic Ring 2 (Cross Axis) */}
        <mesh ref={ring2} material={ring2Material}>
          <torusGeometry args={[2.1, 0.03, 16, isMobile ? 32 : 64]} />
        </mesh>
      </group>
    </Float>
  );
}

function Scene({ isMobile }) {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        camera.position.set(0, 0, 9);
        camera.fov = 60;
      } else {
        camera.position.set(0, 0, 7);
        camera.fov = 48;
      }
      camera.updateProjectionMatrix();
    };
    handleResize();

    const handlePointerMove = (e) => {
      // Discard touch events: touch scrolling must never shake or jitter the 3D scene
      if (e.pointerType === "touch") return;
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [camera]);

  useFrame(() => {
    // Smooth, stabilized camera parallax with gentle damping
    const targetX = mouse.current.x * 0.8;
    const targetY = mouse.current.y * 0.8;
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[8, 8, 6]} color="#00f2fe" intensity={80} distance={20} />
      <pointLight position={[-8, -8, 6]} color="#8a5cf6" intensity={80} distance={20} />
      <pointLight position={[0, -6, -4]} color="#ff3366" intensity={60} distance={15} />

      <Sparkles
        count={isMobile ? 35 : 70}
        scale={10}
        size={isMobile ? 2 : 3}
        speed={0.4}
        opacity={0.4}
        color="#00f2fe"
      />
      <Sparkles
        count={isMobile ? 25 : 50}
        scale={12}
        size={isMobile ? 2 : 3}
        speed={0.3}
        opacity={0.3}
        color="#8a5cf6"
      />

      <BiometricCore isMobile={isMobile} />
    </>
  );
}

export default function LandingScene() {
  const [supported, setSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setSupported(isWebGLAvailable());
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!supported) return null;

  return (
    <ThreeErrorBoundary fallback={null}>
      <div
        className="rf-hero-canvas-wrap"
        style={{ touchAction: "pan-y" }}
      >
        <Canvas
          camera={{ position: [0, 0, 7], fov: 50 }}
          dpr={typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 1.5) : 1}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        >
          <Scene isMobile={isMobile} />
        </Canvas>
      </div>
    </ThreeErrorBoundary>
  );
}
