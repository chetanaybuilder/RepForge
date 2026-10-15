/**
 * RepForge - Ambient 3D Starfield & Neural Sparkles
 *
 * Responsibilities:
 * - Low-power background particles and deep starfield for desktop viewports.
 * - Auto-throttled at 1 DPR and low-power WebGL preference.
 */

import { Canvas } from "@react-three/fiber";
import { Sparkles, Stars } from "@react-three/drei";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";

function AmbientScene() {
  return (
    <>
      <Stars radius={40} depth={40} count={1000} factor={2} saturation={0} fade speed={0.6} />
      <Sparkles count={25} scale={10} size={2} speed={0.25} opacity={0.1} color="#8a5cf6" />
      <Sparkles count={25} scale={10} size={2} speed={0.25} opacity={0.1} color="#00f2fe" />
    </>
  );
}

export default function AmbientScene3D() {
  return (
    <ThreeErrorBoundary fallback={null}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.35,
        }}
        aria-hidden="true"
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 60 }}
          gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
          dpr={1}
        >
          <AmbientScene />
        </Canvas>
      </div>
    </ThreeErrorBoundary>
  );
}
