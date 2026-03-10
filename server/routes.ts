import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getAuthenticatedUser, getRepository, createRepository } from "./github";

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

  return httpServer;
}
