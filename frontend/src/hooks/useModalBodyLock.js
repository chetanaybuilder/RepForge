import { useEffect } from "react";

let activeLocks = 0;
let previousStyles;

export function useModalBodyLock(open) {
  useEffect(() => {
    if (!open) return undefined;

    if (activeLocks === 0) {
      const body = document.body;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      previousStyles = {
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight,
      };
      body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    activeLocks += 1;
    return () => {
      activeLocks -= 1;
      if (activeLocks === 0 && previousStyles) {
        document.body.style.overflow = previousStyles.overflow;
        document.body.style.paddingRight = previousStyles.paddingRight;
        previousStyles = undefined;
      }
    };
  }, [open]);
}
