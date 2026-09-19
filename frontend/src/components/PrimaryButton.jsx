import { motion } from 'framer-motion';
import { useState } from 'react';

export function PrimaryButton({ children, onClick, className = '', disabled = false, type = 'button', style = {} }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={`rf-btn ${className}`}
      style={{
        position: 'relative',
        border: 'none',
        background: 'var(--rf-gradient-primary)',
        color: '#07070b',
        fontWeight: 700,
        ...style
      }}
    >
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        style={{
          position: 'absolute',
          top: '-50%', left: '-50%', right: '-50%', bottom: '-50%',
          background: 'conic-gradient(from 0deg, transparent 0%, #22d3ee 40%, #8a5cf6 60%, transparent 100%)',
          zIndex: -2,
          opacity: isHovered ? 1 : 0.4,
          filter: 'blur(8px)',
        }}
      />
      {/* This inner div acts as a solid mask if we wanted a dark button, but since we want the button to be solid primary color, the above rotating div just bleeds out as a glowing blurred border! */}
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        {children}
      </span>
    </motion.button>
  );
}
