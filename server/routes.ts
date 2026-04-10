import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getAuthenticatedUser, getRepository, createRepository, pushCodebase, getRepoTree, getFileContent } from "./github";
import * as fs from "fs";
import * as path from "path";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/github/user", async (_req, res) => {
    try {
      const user = await getAuthenticatedUser();
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/github/repo", async (_req, res) => {
    try {
      const user = await getAuthenticatedUser();
      const repo = await getRepository(user.login, "ROADS-LOS");
      res.json(repo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/github/repo", async (_req, res) => {
    try {
      const repo = await createRepository("ROADS-LOS", {
        description: "ROADS LOS - Living prototype of a Loan Origination System",
        isPrivate: false,
      });
      res.json(repo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/loans/:id", async (req, res) => {
    try {
      const loan = await storage.getLoan(req.params.id);
      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }
      const borrowers = await storage.getBorrowersByLoanId(req.params.id);
      res.json({ ...loan, borrowers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/github/pull", async (_req, res) => {
    try {
      const owner = "bennorthrup";
      const repo = "ROADS-LOS";

      const { commitSha, tree } = await getRepoTree(owner, repo);

      const IGNORE_DIRS = new Set(["node_modules", ".git", ".cache", "dist", ".local", ".agents", "migrations", ".config", ".upm"]);
      const IGNORE_FILES = new Set(["package-lock.json"]);

      const projectRoot = path.resolve(process.cwd());
      let updatedCount = 0;

      for (const item of tree) {
        if (item.type !== "blob") continue;

        const parts = item.path.split("/");
        const shouldIgnore = parts.some((p: string) => IGNORE_DIRS.has(p) || p.startsWith("."));
        const fileName = parts[parts.length - 1];
        if (shouldIgnore || IGNORE_FILES.has(fileName)) continue;

        try {
          const content = await getFileContent(owner, repo, item.path);
          if (content !== null) {
            const filePath = path.join(projectRoot, item.path);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, content, "utf-8");
            updatedCount++;
          }
        } catch {}
      }

      res.json({ commitSha, filesUpdated: updatedCount, message: `Pulled ${updatedCount} files from ${owner}/${repo}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/github/push", async (req, res) => {
    try {
      const owner = "bennorthrup";
      const repo = "ROADS-LOS";
      const commitMessage = req.body?.message || "Update codebase from Replit";

      const IGNORE_DIRS = new Set(["node_modules", ".git", ".cache", "dist", ".local", ".agents", "migrations", ".config", ".upm", "attached_assets"]);
      const IGNORE_FILES = new Set(["package-lock.json"]);
      const BINARY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".pdf", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".webm", ".zip", ".tar", ".gz"]);
      const MAX_FILE_SIZE = 500 * 1024;

      function collectFiles(dir: string, base: string = ""): { path: string; content: string }[] {
        const results: { path: string; content: string }[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = base ? `${base}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
              results.push(...collectFiles(fullPath, relativePath));
            }
          } else if (entry.isFile()) {
            if (IGNORE_FILES.has(entry.name)) continue;
            const ext = path.extname(entry.name).toLowerCase();
            if (BINARY_EXTENSIONS.has(ext)) continue;
            try {
              const stats = fs.statSync(fullPath);
              if (stats.size > MAX_FILE_SIZE) continue;
              const content = fs.readFileSync(fullPath, "utf-8");
              results.push({ path: relativePath, content });
            } catch {}
          }
        }
        return results;
      }

      const projectRoot = path.resolve(process.cwd());
      const files = collectFiles(projectRoot);

      const result = await pushCodebase(owner, repo, files, commitMessage);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
