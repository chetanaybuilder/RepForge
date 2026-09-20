import { motion } from "framer-motion";

export function PrimaryButton({
  children,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  variant = "cyan", // "cyan" | "violet" | "ghost" | "danger"
  style = {},
  ...props
}) {
  const variantClass = 
    variant === "violet" ? "rf-btn--violet" :
    variant === "ghost" ? "rf-btn--ghost" :
    variant === "danger" ? "rf-btn--danger" :
    "rf-btn--primary";

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`rf-btn ${variantClass} ${className}`}
      style={style}
      {...props}
    >
      <span style={{ position: "relative", zIndex: 2, display: "inline-flex", alignItems: "center", gap: 8 }}>
        {children}
      </span>
    </motion.button>
  );
}
