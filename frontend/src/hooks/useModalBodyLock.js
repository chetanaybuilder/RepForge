/**
 * frontend\src\hooks\useModalBodyLock.js
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

import { useEffect } from "react";

let activeLocks = 0;
let previousStyles = null;
let previousViewportStyles = null;
let viewportCleanup = null;

export function useModalBodyLock(open) {
  useEffect(() => {
    if (!open) return undefined;

    const html = document.documentElement;
    const body = document.body;
    const syncViewport = () => {
      html.style.setProperty("--rf-modal-viewport-height", `${Math.max(0, window.innerHeight)}px`);
    };

    if (activeLocks === 0) {
      previousStyles = {
        htmlOverflow: html.style.overflow,
        bodyOverflow: body.style.overflow,
      };
      previousViewportStyles = {
        height: html.style.getPropertyValue("--rf-modal-viewport-height"),
        offsetTop: html.style.getPropertyValue("--rf-modal-viewport-offset-top"),
      };
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      syncViewport();
      window.addEventListener("resize", syncViewport);
      viewportCleanup = () => {
        window.removeEventListener("resize", syncViewport);
      };
    }

    activeLocks += 1;
    return () => {
      activeLocks -= 1;
      if (activeLocks === 0 && previousStyles) {
        viewportCleanup?.();
        viewportCleanup = null;
        html.style.overflow = previousStyles.htmlOverflow;
        body.style.overflow = previousStyles.bodyOverflow;
        if (previousViewportStyles?.height) {
          html.style.setProperty("--rf-modal-viewport-height", previousViewportStyles.height);
        } else {
          html.style.removeProperty("--rf-modal-viewport-height");
        }
        if (previousViewportStyles?.offsetTop) {
          html.style.setProperty(
            "--rf-modal-viewport-offset-top",
            previousViewportStyles.offsetTop
          );
        } else {
          html.style.removeProperty("--rf-modal-viewport-offset-top");
        }
        previousStyles = null;
        previousViewportStyles = null;
      }
    };
  }, [open]);
}
