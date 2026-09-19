import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("three-stdlib")) return "three-stdlib";
          if (id.includes("three")) return "three";
          if (id.includes("@react-three")) return "react-three";
          if (id.includes("recharts")) return "recharts";
        },
      },
    },
  },
});
