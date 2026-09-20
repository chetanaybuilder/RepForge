import { Canvas } from "@react-three/fiber";
import { Sparkles, Stars } from "@react-three/drei";
import { useState, useEffect } from "react";
import { isWebGLAvailable } from "../../utils/webgl";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";

function AmbientScene() {
  return (
    <>
      <Stars radius={50} depth={50} count={1500} factor={2} saturation={0} fade speed={1} />
      <Sparkles count={40} scale={12} size={2} speed={0.4} opacity={0.15} color="#8a5cf6" />
      <Sparkles count={40} scale={12} size={2} speed={0.4} opacity={0.15} color="#22d3ee" />
    </>
  );
}

export function AmbientBackground3D() {
  const [isLiteMode, setIsLiteMode] = useState(false);

  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const isMobile = window.innerWidth < 768;
      setIsLiteMode(mediaQuery.matches || isMobile || !isWebGLAvailable());
    } catch {
      setIsLiteMode(true);
    }
  }, []);

  if (isLiteMode) return null;

  return (
    <ThreeErrorBoundary fallback={null}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.35 }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }} gl={{ alpha: true }}>
          <AmbientScene />
        </Canvas>
      </div>
    </ThreeErrorBoundary>
  );
}
