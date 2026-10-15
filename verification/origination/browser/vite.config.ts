import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const project = path.resolve(import.meta.dirname, "../../..");
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  resolve: { alias: [
    { find: "@/components/GitHubSyncPanel", replacement: path.resolve(import.meta.dirname, "admin-stub.tsx") },
    { find: "@", replacement: path.resolve(project, "client/src") },
    { find: "@shared", replacement: path.resolve(project, "shared") },
  ] },
  server: {
    host: "0.0.0.0", port: 4317, strictPort: true, hmr: false,
    fs: { allow: [project] },
  },
});
