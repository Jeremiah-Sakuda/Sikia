import { defineConfig } from "vite";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  base: "/userland/",
  build: { outDir: "dist", emptyOutDir: true },
});
