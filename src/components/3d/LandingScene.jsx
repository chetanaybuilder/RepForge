/**
 * RepForge - Landing Hero Scene Controller
 *
 * Responsibilities:
 * - Employs LazyThree to dynamically load Three.js landing scene only on capable devices.
 * - Instantly renders LandingScene2D fallback for reduced motion, low hardware, or non-WebGL clients.
 */

import { LazyThree } from "./LazyThree";
import { LandingScene2D } from "./LandingScene2D";

export default function LandingScene() {
  return (
    <LazyThree
      loadComponent={() => import("./LandingScene3D")}
      fallback={<LandingScene2D />}
    />
  );
}
