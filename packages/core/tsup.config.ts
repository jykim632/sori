import { defineConfig } from "tsup";

export default defineConfig([
  // ESM + CJS for npm
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    minify: true,
    treeshake: true,
  },
  // IIFE for CDN (single file, auto-init)
  {
    entry: ["src/cdn.ts"],
    format: ["iife"],
    globalName: "Sori",
    outExtension: () => ({ js: ".js" }),
    dts: true,
    sourcemap: true,
    minify: true,
    treeshake: true,
  },
]);
