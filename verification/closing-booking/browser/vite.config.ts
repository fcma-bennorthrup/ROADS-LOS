import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
export default defineConfig({
  root,
  plugins: [react()],
  publicDir: false,
  resolve: { alias: {
    "@": path.join(root, "client/src"),
    "@shared": path.join(root, "shared"),
    "@assets": path.join(root, "attached_assets"),
  } },
  build: {
    outDir: "../browser-site",
    emptyOutDir: true,
    rollupOptions: { input: path.join(import.meta.dirname, "index.html") },
  },
});
