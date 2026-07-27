import { defineConfig } from "tsup";

// Production build. We run native ESM in prod (package.json "type": "module"),
// which requires explicit ".js" extensions on relative imports — something tsc
// does NOT add, so a raw `tsc` build crashes under plain node with
// ERR_MODULE_NOT_FOUND. Bundling sidesteps that entirely: esbuild resolves every
// relative import (our src + the generated Prisma client) at build time, so no
// loose relative imports survive to runtime.
//
// Everything in node_modules stays EXTERNAL (tsup's default for `dependencies`):
//   - bcrypt is a native .node addon and cannot be bundled;
//   - @prisma/client ships the WASM query compiler that the generated client
//     loads via a dynamic import() — it must resolve from node_modules at runtime.
// node_modules is present on the server (npm install), so externals resolve fine.
export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  platform: "node",
  target: "node22",
  clean: true,
  sourcemap: true,
});
