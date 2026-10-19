import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const outputDirectory = resolve(process.env.CF_PAGES_OUTPUT_DIR || "dist");
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: ["worker/index.js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: resolve(outputDirectory, "_worker.js"),
});
