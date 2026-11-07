/**
 * RepForge - Intelligent Lazy Three.js Renderer
 *
 * Responsibilities:
 * - Prevents downloading or instantiating the Three.js bundle on low-tier, reduced-motion,
 *   or non-WebGL devices.
 * - Renders a sleek 2D fallback instantly with zero bundle overhead.
 * - Manages React Suspense and smooth opacity transitions.
 */

import React, { Suspense, useMemo } from "react";
import { ThreeErrorBoundary } from "./ThreeErrorBoundary";
import { useGraphicsTier } from "../../utils/graphicsTier";

const lazyCache = new Map();

function getLazyComponent(loader) {
  if (!loader) return null;
  if (!lazyCache.has(loader)) {
    lazyCache.set(loader, React.lazy(loader));
  }
  return lazyCache.get(loader);
}

/**
 * Intelligent 3D Wrapper that guards Three.js loading based on hardware capabilities.
 *
 * @param {{
 *   loadComponent: () => Promise<{ default: React.ComponentType<any> }>,
 *   fallback: React.ReactNode,
 *   props?: Record<string, any>
 * }} props
 */
export function LazyThree({ loadComponent, fallback, props = {} }) {
  const { canRender3D, tier } = useGraphicsTier();

  const LazyComponent = useMemo(() => {
    if (!canRender3D) return null;
    return getLazyComponent(loadComponent);
  }, [canRender3D, loadComponent]);

  if (!canRender3D || !LazyComponent) {
    return <>{fallback}</>;
  }

  return (
    <ThreeErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LazyComponent tier={tier} {...props} />
      </Suspense>
    </ThreeErrorBoundary>
  );
}
