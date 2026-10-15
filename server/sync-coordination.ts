import { createServer } from "node:net";
import { createHash } from "crypto";
import type { RequestHandler } from "express";

export const SYNC_BUSY = "Another sync operation is in progress. Wait for it to finish, then retry.";

// Linux abstract-domain sockets are kernel-owned mutexes: exclusive across
// processes in this network namespace, and released even on SIGKILL. No stale
// lock-file timeout, PID guessing, TCP listener, or new dependency is needed.
export function createSyncCoordinator(root: string) {
  const name = "\0roads-sync-" + createHash("sha256").update(root).digest("hex");
  async function acquire(): Promise<() => Promise<void>> {
    if (process.platform !== "linux") {
      throw new Error("Sync coordination requires Linux abstract Unix sockets. No sync changes were made.");
    }
    const server = createServer((socket) => socket.destroy());
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(name, () => {
        server.removeListener("error", reject);
        resolve();
      });
    });
    return () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  function wrap(handler: RequestHandler): RequestHandler {
    return async (req, res, next) => {
      let release: () => Promise<void>;
      try {
        release = await acquire();
      } catch (error) {
        const busy = (error as NodeJS.ErrnoException).code === "EADDRINUSE";
        res.status(busy ? 409 : 503).json({
          error: busy ? SYNC_BUSY : "Sync coordination is unavailable. No sync changes were made.",
        });
        return;
      }
      try { await handler(req, res, next); }
      finally { await release(); }
    };
  }
  return { acquire, wrap };
}
