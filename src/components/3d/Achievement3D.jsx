import { LazyThree } from "./LazyThree";

/**
 * Lightweight hardware-accelerated CSS badge fallback for inactive badges
 * or when WebGL context quota is exceeded / disabled.
 * @param {{ color?: string, active?: boolean, size?: number }} props
 */
function FallbackGem({ color = "#8a5cf6", active, size = 56 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "14px",
        background: active
          ? `radial-gradient(circle, ${color}33 0%, rgba(10,10,20,0.6) 70%)`
          : "rgba(255,255,255,0.03)",
        border: active ? `1px solid ${color}88` : "1px solid rgba(255,255,255,0.08)",
        boxShadow: active ? `0 0 16px ${color}44` : "none",
        fontSize: Math.round(size * 0.44),
        color: active ? color : "var(--rf-text-faint)",
      }}
      aria-hidden="true"
    >
      {active ? "✦" : "◇"}
    </div>
  );
}

/**
 * 3D Achievement Gem Component with dynamic context budgeting and lazy loading.
 *
 * @param {{ color?: string, active?: boolean, size?: number }} props
 */
export function Achievement3D({ color = "#8a5cf6", active = true, size = 56 }) {
  const fallback = <FallbackGem color={color} active={active} size={size} />;

  if (!active) {
    return fallback;
  }

  return (
    <LazyThree
      loadComponent={() => import("./QuantumGemCanvas")}
      fallback={fallback}
      props={{ color, active, size, fallback }}
    />
  );
}

