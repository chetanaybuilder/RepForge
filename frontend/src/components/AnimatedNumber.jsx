import { motion, useSpring, useMotionValueEvent } from "framer-motion";
import { useEffect, useState } from "react";

export function AnimatedNumber({ value, format = (n) => Math.round(n) }) {
  const [numVal, setNumVal] = useState(0);
  const [suffix, setSuffix] = useState("");
  const [display, setDisplay] = useState("");
  
  useEffect(() => {
    if (typeof value === "number") {
      setNumVal(value);
    } else if (typeof value === "string") {
      const parsed = parseFloat(value.replace(/,/g, ''));
      if (!isNaN(parsed)) {
        setNumVal(parsed);
        const match = value.match(/[a-zA-Z%]+/);
        if (match) setSuffix(" " + match[0].trim());
      }
    }
  }, [value]);

  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  
  useMotionValueEvent(spring, "change", (latest) => {
    setDisplay(format(latest) + suffix);
  });

  useEffect(() => {
    spring.set(numVal);
  }, [numVal, spring]);

  return <span>{display || (format(numVal) + suffix)}</span>;
}
