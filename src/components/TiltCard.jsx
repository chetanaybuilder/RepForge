import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useState } from "react";

export function TiltCard({ children, className = "", style = {} }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);
  
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

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
        perspective: 1200,
        position: 'relative',
        ...style
      }}
      whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(138,92,246,0.3)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {isHovered && (
        <motion.div 
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at center, rgba(138,92,246,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
            borderRadius: 'inherit'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
      <div style={{ transform: "translateZ(30px)", position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </motion.div>
  );
}
