import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getAuthenticatedUser, getRepository, createRepository, pushCodebase } from "./github";
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

  app.post("/api/github/push", async (req, res) => {
    try {
      const user = await getAuthenticatedUser();
      const owner = user.login;
      const repo = "ROADS-LOS";
      const commitMessage = req.body?.message || "Update codebase from Replit";

      const IGNORE_DIRS = new Set(["node_modules", ".git", ".cache", "dist", ".local", ".agents", "migrations", ".config", ".upm"]);
      const IGNORE_FILES = new Set(["package-lock.json"]);

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
            if (!IGNORE_FILES.has(entry.name)) {
              try {
                const content = fs.readFileSync(fullPath, "utf-8");
                results.push({ path: relativePath, content });
              } catch {}
            }
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
