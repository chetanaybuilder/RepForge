import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useState, useEffect } from "react";

export function TiltCard({ children, className = "", style = {}, glowColor = "cyan" }) {
  const [canHover, setCanHover] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    try {
      const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
      setCanHover(mq.matches);
      const handler = (e) => setCanHover(e.matches);
      if (mq.addEventListener) mq.addEventListener("change", handler);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", handler);
      };
    } catch {
      setCanHover(false);
    }
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 280, damping: 22 });
  const mouseYSpring = useSpring(y, { stiffness: 280, damping: 22 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e) => {
    if (!canHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    if (!canHover) return;
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const glowRgb = glowColor === "ember" ? "255, 51, 102" : glowColor === "violet" ? "138, 92, 246" : "0, 242, 254";

  if (!canHover) {
    // Touch / Mobile Fallback: pure hardware accelerated tap response without perspective distortion
    return (
      <div className={className} style={{ position: "relative", ...style }}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
        position: "relative",
        ...style,
      }}
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
    >
      {isHovered && (
        <motion.div
          style={{
            position: "absolute",
            inset: -1,
            borderRadius: "inherit",
            background: `radial-gradient(circle at center, rgba(${glowRgb}, 0.18) 0%, transparent 70%)`,
            pointerEvents: "none",
            zIndex: 0,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      <div style={{ transform: "translateZ(18px)", position: "relative", zIndex: 1, height: "100%" }}>
        {children}
      </div>
    </motion.div>
  );
}
