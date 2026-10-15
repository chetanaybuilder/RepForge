/**
 * RepForge 2040 - 2D Holographic Fallback for Dashboard Hero
 *
 * Responsibilities:
 * - High-fidelity animated SVG / CSS telemetry rings for devices where 3D is disabled,
 *   prefers-reduced-motion is active, or WebGL context is unavailable.
 * - Zero WebGL overhead, strictly 60fps hardware accelerated CSS transitions.
 */

export function DashboardHero2D() {
  return (
    <div
      className="rf-dashboard-hero-2d"
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 400 400"
        style={{
          width: "min(340px, 80%)",
          height: "min(340px, 80%)",
          filter: "drop-shadow(0 0 24px rgba(0, 242, 254, 0.25))",
        }}
      >
        <defs>
          <linearGradient id="rfHoloCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8a5cf6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="rfHoloViolet" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8a5cf6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff3366" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id="rfCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Center Glow Mesh */}
        <circle cx="200" cy="200" r="140" fill="url(#rfCenterGlow)" />

        {/* Outer Orbit Ring */}
        <circle
          cx="200"
          cy="200"
          r="130"
          fill="none"
          stroke="url(#rfHoloCyan)"
          strokeWidth="1.5"
          strokeDasharray="8 6"
          className="rf-spin-slow"
          style={{ transformOrigin: "center" }}
        />

        {/* Middle Counter-Rotating Ring */}
        <circle
          cx="200"
          cy="200"
          r="95"
          fill="none"
          stroke="url(#rfHoloViolet)"
          strokeWidth="2"
          strokeDasharray="16 12"
          className="rf-spin-reverse"
          style={{ transformOrigin: "center" }}
        />

        {/* Inner Solid Telemetry Ring */}
        <circle
          cx="200"
          cy="200"
          r="60"
          fill="none"
          stroke="#00f2fe"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.6"
        />

        {/* Core Node */}
        <polygon
          points="200,165 230,185 230,215 200,235 170,215 170,185"
          fill="rgba(0, 242, 254, 0.12)"
          stroke="#00f2fe"
          strokeWidth="1.5"
          className="rf-spin-slow"
          style={{ transformOrigin: "center" }}
        />
        <circle cx="200" cy="200" r="12" fill="#00f2fe" opacity="0.8" />
      </svg>
    </div>
  );
}
