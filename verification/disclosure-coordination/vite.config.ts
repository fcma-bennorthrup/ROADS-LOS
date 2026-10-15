import { defineConfig, mergeConfig } from "vite";
import base from "../documents/vite.config";
import path from "node:path";
export default mergeConfig(base, defineConfig({
  build: { outDir: "verification/disclosure-coordination/dist", rollupOptions: {
    input: path.resolve(import.meta.dirname, "index.html"),
  } },
}));
