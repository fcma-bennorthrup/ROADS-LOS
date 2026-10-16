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
  // Disposable output only. External fonts deliberately blocked; no new fonts.
  build: { outDir: "verification/documents/dist", rollupOptions: {
    input: path.join(root, "verification/documents/index.html"),
  } },
  server: { host: "0.0.0.0", port: 4173, strictPort: true, allowedHosts: true, hmr: false },
});
