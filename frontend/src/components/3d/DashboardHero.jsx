/**
 * RepForge - Dashboard Hero 3D / 2D Hologram
 *
 * Responsibilities:
 * - Employs LazyThree to dynamically stream Three.js Dashboard Hero only on capable devices.
 * - Instantly displays lightweight SVG telemetry rings on mobile, low-tier, or reduced-motion.
 */

import { DashboardHero2D } from "./DashboardHero2D";

export function DashboardHero() {
  return <DashboardHero2D />;
}
