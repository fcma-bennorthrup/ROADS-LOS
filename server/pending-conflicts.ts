import * as fs from "fs";
import * as path from "path";
import type { ConflictedFile, FileEntry } from "./conflict-detection";

const PENDING_CONFLICTS_FILE = path.resolve(process.cwd(), ".local/pending-conflicts.json");

export interface PendingConflicts {
  operation: "push" | "pull";
  conflicts: ConflictedFile[];
  safeToUpdate: FileEntry[];
  safeToDelete?: string[];
  remoteHeadSha: string;
  commitMessage?: string;
  createdAt: string;
  localHashes?: Record<string, string | null>;
}

export function getPendingConflicts(): PendingConflicts | null {
  try {
    if (fs.existsSync(PENDING_CONFLICTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PENDING_CONFLICTS_FILE, "utf-8")) as PendingConflicts;
      return data;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return null;
}

export function setPendingConflicts(pending: PendingConflicts): void {
  const dir = path.dirname(PENDING_CONFLICTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(PENDING_CONFLICTS_FILE + ".tmp", JSON.stringify(pending, null, 2), "utf-8");
  fs.renameSync(PENDING_CONFLICTS_FILE + ".tmp", PENDING_CONFLICTS_FILE);
}

export function clearPendingConflicts(): void {
  try {
    if (fs.existsSync(PENDING_CONFLICTS_FILE)) {
      fs.unlinkSync(PENDING_CONFLICTS_FILE);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
