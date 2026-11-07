/**
 * @file vite.config.js
 * @description Vite configuration for RepForge React SPA.
 * Configures React plugin, development proxy to the local API target,
 * and optimized vendor chunk splitting for 3D/chart libraries.
 */

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFile, writeFile } from "node:fs/promises";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_DEV_PROXY_TARGET || "http://localhost:5000";

  return {
    plugins: [
      react(),
      {
        name: "repforge-api-csp-header",
        async closeBundle() {
          const apiUrl = env.VITE_API_URL?.trim();
          let extraOrigin = "";
          if (apiUrl) {
            try {
              extraOrigin = ` ${new URL(apiUrl).origin}`;
            } catch {
              // Invalid API URLs are ignored rather than weakening the CSP.
            }
          }
          const source = await readFile(new URL("./public/_headers", import.meta.url), "utf8");
          const output = source.replace("connect-src 'self';", `connect-src 'self'${extraOrigin};`);
          await writeFile(
            `${process.env.CF_PAGES_OUTPUT_DIR || "../dist"}/_headers`,
            output,
            "utf8"
          );
        },
      },
    ],
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
            const normalized = id.replace(/\\/g, "/");
            if (
              normalized.includes("/node_modules/three/") ||
              normalized.includes("/node_modules/@react-three/")
            ) {
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
