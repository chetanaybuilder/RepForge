/**
 * @file vite.config.js
 * @description Vite configuration for RepForge React SPA.
 * Configures React plugin, development proxy to local Flask backend (port 5000),
 * and optimized vendor chunk splitting for 3D/chart libraries.
 */

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_API_URL || env.VITE_BACKEND_URL || "http://localhost:5000";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/auth": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: process.env.CF_PAGES_OUTPUT_DIR || "../dist",
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("@react-three") || id.includes("three")) {
              return "three-bundle";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "recharts-bundle";
            }
            if (id.includes("framer-motion")) {
              return "motion-bundle";
            }
          },
        },
      },
    },
  };
});
