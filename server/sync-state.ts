import * as fs from "fs";
import * as path from "path";

const SYNC_STATE_FILE = path.resolve(process.cwd(), ".local/github-sync-state.json");

interface SyncState {
  lastSyncedCommitSha: string;
  lastSyncedAt: string;
}

export function getLastSyncedCommit(): string | null {
  try {
    if (fs.existsSync(SYNC_STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(SYNC_STATE_FILE, "utf-8")) as SyncState;
      return data.lastSyncedCommitSha || null;
    }
  } catch {}
  return null;
}

export function setLastSyncedCommit(sha: string): void {
  const dir = path.dirname(SYNC_STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const state: SyncState = {
    lastSyncedCommitSha: sha,
    lastSyncedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}
