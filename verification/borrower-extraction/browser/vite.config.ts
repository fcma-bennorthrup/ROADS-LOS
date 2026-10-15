import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const project = path.resolve(import.meta.dirname, "../../..");
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(project, "client/src") } },
  server: { host: "0.0.0.0", port: 4317, strictPort: true, hmr: false,
    allowedHosts: true, fs: { allow: [project] } },
});
