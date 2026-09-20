import { Canvas } from "@react-three/fiber";
import { Sparkles, Stars } from "@react-three/drei";
import { useState, useEffect } from "react";
import { isWebGLAvailable } from "../../utils/webgl";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";

function AmbientScene() {
  return (
    <>
      <Stars radius={40} depth={40} count={1200} factor={2} saturation={0} fade speed={0.8} />
      <Sparkles count={30} scale={10} size={2} speed={0.3} opacity={0.12} color="#8a5cf6" />
      <Sparkles count={30} scale={10} size={2} speed={0.3} opacity={0.12} color="#00f2fe" />
    </>
  );
}

export function AmbientBackground3D() {
  const [isLiteMode, setIsLiteMode] = useState(false);

  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const isMobile = window.innerWidth < 768;
      setIsLiteMode(Boolean(mediaQuery.matches || isMobile || !isWebGLAvailable()));
    } catch {
      setIsLiteMode(true);
    }
  }, []);

  if (isLiteMode) return null;

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
