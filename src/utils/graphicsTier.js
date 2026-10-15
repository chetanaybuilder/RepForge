/**
 * RepForge Graphics & 3D Hardware Tier Orchestrator
 *
 * Responsibilities:
 * - Detects WebGL context capability and browser hardware concurrency/memory.
 * - Respects OS 'prefers-reduced-motion: reduce' media queries.
 * - Supports automatic tier downgrading on low-spec mobile devices to preserve 60fps.
 * - Provides user preference persistence ('auto' | '3d' | '2d') via localStorage.
 */

import { useState, useEffect, useCallback } from "react";
import { isWebGLAvailable } from "./webgl";

const STORAGE_KEY = "rf_graphics_mode";

/**
 * Evaluates whether the client device qualifies for rich 3D rendering.
 *
 * @returns {{ canRender3D: boolean, tier: 'high' | 'medium' | 'low' | 'off', isReducedMotion: boolean }}
 */
export function evaluateGraphicsCapability() {
  if (typeof window === "undefined") {
    return { canRender3D: false, tier: "off", isReducedMotion: false };
  }

  // Check user preference override
  let userOverride = "auto";
  try {
    userOverride = localStorage.getItem(STORAGE_KEY) || "auto";
  } catch {
    userOverride = "auto";
  }

  if (userOverride === "2d") {
    return { canRender3D: false, tier: "off", isReducedMotion: false };
  }

  // Check prefers-reduced-motion
  let isReducedMotion = false;
  try {
    isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    isReducedMotion = false;
  }

  if (isReducedMotion && userOverride !== "3d") {
    return { canRender3D: false, tier: "off", isReducedMotion: true };
  }

  // Check WebGL availability
  if (!isWebGLAvailable()) {
    return { canRender3D: false, tier: "off", isReducedMotion };
  }

  // Check hardware hints
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;
  const isSaveData = Boolean(navigator.connection?.saveData);

  if (isSaveData && userOverride !== "3d") {
    return { canRender3D: false, tier: "off", isReducedMotion };
  }

  // Detect low-power mobile or constrained CPU
  if (cores <= 2 || memory < 3) {
    if (userOverride === "3d") {
      return { canRender3D: true, tier: "low", isReducedMotion };
    }
    return { canRender3D: false, tier: "off", isReducedMotion };
  }

  if (cores <= 4 || memory <= 4 || window.innerWidth < 768) {
    return { canRender3D: true, tier: "medium", isReducedMotion };
  }

  return { canRender3D: true, tier: "high", isReducedMotion };
}

/**
 * React hook to observe graphics tier and switch modes dynamically.
 *
 * @returns {{
 *   canRender3D: boolean,
 *   tier: 'high' | 'medium' | 'low' | 'off',
 *   isReducedMotion: boolean,
 *   mode: string,
 *   setMode: (mode: 'auto' | '3d' | '2d') => void
 * }}
 */
export function useGraphicsTier() {
  const [capability, setCapability] = useState(evaluateGraphicsCapability);
  const [mode, setModeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "auto";
    } catch {
      return "auto";
    }
  });

  const setMode = useCallback((newMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // storage unavailable
    }
    setModeState(newMode);
    setCapability(evaluateGraphicsCapability());
  }, []);

  useEffect(() => {
    const handleMediaChange = () => {
      setCapability(evaluateGraphicsCapability());
    };

    let motionMq;
    try {
      motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (motionMq.addEventListener) {
        motionMq.addEventListener("change", handleMediaChange);
      }
    } catch {
      // Ignore
    }

    const handleResize = () => {
      setCapability(evaluateGraphicsCapability());
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (motionMq && motionMq.removeEventListener) {
        motionMq.removeEventListener("change", handleMediaChange);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return {
    ...capability,
    mode,
    setMode,
  };
}
