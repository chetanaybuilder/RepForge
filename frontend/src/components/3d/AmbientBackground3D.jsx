/**
 * RepForge - Ambient Background Orchestrator
 *
 * Responsibilities:
 * - Employs LazyThree to dynamically load the ambient 3D starfield only on capable devices.
 * - Falls back to a lightweight CSS gradient nebula on low-tier or reduced-motion environments.
 */

import { LazyThree } from "./LazyThree";

function FallbackNebula() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(circle at 50% 20%, rgba(138, 92, 246, 0.04) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(0, 242, 254, 0.03) 0%, transparent 50%)",
      }}
      aria-hidden="true"
    />
  );
}

export function AmbientBackground3D() {
  return (
    <LazyThree
      loadComponent={() => import("./AmbientScene3D")}
      fallback={<FallbackNebula />}
    />
  );
}
