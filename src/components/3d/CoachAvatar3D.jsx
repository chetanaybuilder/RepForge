/**
 * RepForge - AI Coach 3D Avatar
 *
 * Responsibilities:
 * - Employs LazyThree to dynamically render 3D neural orb on capable devices.
 * - Renders high-performance FallbackAvatar on 2D, reduced-motion, or non-WebGL devices.
 */

import { LazyThree } from "./LazyThree";

function FallbackAvatar({ size }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle at 30% 30%, #00f2fe, #8a5cf6 70%, #05050a 100%)",
        boxShadow: "0 0 16px rgba(0, 242, 254, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: Math.max(12, Math.round(size * 0.38)),
        flexShrink: 0,
        border: "1px solid rgba(0, 242, 254, 0.4)",
      }}
      aria-hidden="true"
    >
      ◈
    </div>
  );
}

export function CoachAvatar3D({ size = 44 }) {
  const fallback = <FallbackAvatar size={size} />;

  return (
    <LazyThree
      loadComponent={() => import("./CoachAvatarCanvas")}
      fallback={fallback}
      props={{ size, fallback }}
    />
  );
}
