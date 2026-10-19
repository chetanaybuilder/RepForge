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

        {/* Original blue-flame strength athlete silhouette */}
        <path
          d="M265 90c-12 14-9 24-2 34-15-8-20-19-17-34-15 13-19 29-10 44-16-6-23-19-21-36-19 18-18 42-4 57-15-2-25-11-31-25-10 24 1 45 19 56-13 2-24-3-34-13 1 22 15 37 35 42-13 7-27 7-42 2 10 19 29 27 49 23 8 13 21 20 39 20 18 0 31-7 39-20 20 4 39-4 49-23-15 5-29 5-42-2 20-5 34-20 35-42-10 10-21 15-34 13 18-11 29-32 19-56-6 14-16 23-31 25 14-15 15-39-4-57 2 17-5 30-21 36 9-15 5-31-10-44 3 15-2 26-17 34 7-10 10-20-2-34Z"
          fill="url(#rfHoloCyan)"
          opacity="0.16"
          stroke="#42d9ff"
          strokeWidth="2"
        />
        <circle cx="200" cy="118" r="19" fill="#07131d" stroke="#65ddff" strokeWidth="2" />
        <path
          d="M182 114l-12-9 13 2-7-12 15 9 2-14 9 14 13-10-3 17-13 8Z"
          fill="#53cfff"
          stroke="#a4eeff"
          strokeWidth="1.5"
        />
        <path
          d="M180 144c-11 4-18 15-20 31l-9 34 14 4 14-27 7 26-16 43 17 7 20-37 20 37 17-7-16-43 7-26 14 27 14-4-9-34c-2-16-9-27-20-31-15 8-29 8-44 0Z"
          fill="#0b1d2a"
          stroke="#65ddff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M160 157l-24 31 9 8 25-22m50-17 23 12 18-23" fill="none" stroke="#65ddff" strokeWidth="9" strokeLinecap="round" />
        <path d="M132 163v-10m-7 10v-10m-7 10v-10m-7 10v-10m21 5h-24" fill="none" stroke="#d7f7ff" strokeWidth="3" strokeLinecap="round" />
        <path d="M177 227l-6 32m52-32 6 32" fill="none" stroke="#65ddff" strokeWidth="8" strokeLinecap="round" />
        <path d="M166 262l-4 26m69-26 4 26" fill="none" stroke="#d7f7ff" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </div>
  );
}
