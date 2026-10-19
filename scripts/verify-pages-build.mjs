import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const outputDirectory = resolve(process.env.CF_PAGES_OUTPUT_DIR || "dist");
const requiredFiles = ["index.html", "_worker.js"].map((fileName) =>
  resolve(outputDirectory, fileName),
);

for (const filePath of requiredFiles) {
  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile() || fileInfo.size === 0) {
      throw new Error(`${filePath} is missing or empty`);
    }
  } catch {
    throw new Error(`Cloudflare Pages build artifact is missing: ${filePath}`);
  }
}

const worker = await readFile(resolve(outputDirectory, "_worker.js"), "utf8");
if (!worker.includes("ASSETS") || !worker.includes("default")) {
  throw new Error(
    "Bundled Pages Worker does not contain the expected Pages entry point",
  );
}

if (/^\s*import\s+.*\s+from\s+["'](?:hono|node:)/m.test(worker)) {
  throw new Error(
    "Bundled Pages Worker contains an unresolved package or Node import",
  );
}

console.log(
  "Cloudflare Pages output verified: SPA assets and bundled Worker are present.",
);
