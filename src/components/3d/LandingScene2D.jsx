/**
 * RepForge - Landing Hero 2D Holographic Fallback
 *
 * Responsibilities:
 * - High-aesthetic animated SVG / CSS kinetic rings for Landing page hero on devices
 *   where 3D is disabled, reduced-motion is requested, or WebGL is unsupported.
 */

export function LandingScene2D() {
  return (
    <div
      className="rf-hero-canvas-wrap"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 500 500"
        style={{
          width: "min(460px, 90%)",
          height: "min(460px, 90%)",
          filter: "drop-shadow(0 0 35px rgba(0, 242, 254, 0.3))",
        }}
      >
        <defs>
          <linearGradient id="rfLandingGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#8a5cf6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="rfLandingGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff3366" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8a5cf6" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="rfCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.35" />
            <stop offset="40%" stopColor="#8a5cf6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Halo */}
        <circle cx="250" cy="250" r="180" fill="url(#rfCoreGlow)" />

        {/* Outer Torus Ring */}
        <circle
          cx="250"
          cy="250"
          r="160"
          fill="none"
          stroke="url(#rfLandingGrad1)"
          strokeWidth="2"
          strokeDasharray="14 10"
          className="rf-spin-slow"
          style={{ transformOrigin: "center" }}
        />

        {/* Inner Counter-Rotating Ring */}
        <circle
          cx="250"
          cy="250"
          r="120"
          fill="none"
          stroke="url(#rfLandingGrad2)"
          strokeWidth="2.5"
          strokeDasharray="20 16"
          className="rf-spin-reverse"
          style={{ transformOrigin: "center" }}
        />

        {/* Inner Octagon */}
        <polygon
          points="250,195 289,211 305,250 289,289 250,305 211,289 195,250 211,211"
          fill="rgba(138, 92, 246, 0.15)"
          stroke="#00f2fe"
          strokeWidth="2"
          className="rf-spin-slow"
          style={{ transformOrigin: "center" }}
        />

        {/* Central Core */}
        <circle cx="250" cy="250" r="22" fill="#00f2fe" opacity="0.9" />
      </svg>
    </div>
  );
}
