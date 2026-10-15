import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../..");
export default defineConfig({
  root,
  plugins: [react()],
  resolve: { alias: {
    "@": path.join(root, "client/src"), "@shared": path.join(root, "shared"),
    "@assets": path.join(root, "attached_assets"),
  } },
  build: { outDir: "verification/partial-reset/dist", rollupOptions: {
    input: path.join(root, "verification/partial-reset/index.html"),
  } },
});
