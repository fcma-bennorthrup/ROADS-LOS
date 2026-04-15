export interface FileEntry {
  path: string;
  content: string;
  encoding?: "utf-8" | "base64";
}

export interface ConflictReport {
  safeToUpdate: FileEntry[];
  conflicts: ConflictedFile[];
  unchanged: string[];
  safeToDelete: string[];
}

export interface ConflictedFile {
  path: string;
  localContent: string | null;
  remoteContent: string | null;
  baseContent: string | null;
  reason: string;
}

function buildContentMap(files: FileEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of files) {
    map.set(f.path, f.content);
  }
  return map;
}

export function detectPushConflicts(
  localFiles: FileEntry[],
  remoteFiles: FileEntry[],
  baseFiles: FileEntry[]
): ConflictReport {
  const localMap = buildContentMap(localFiles);
  const remoteMap = buildContentMap(remoteFiles);
  const baseMap = buildContentMap(baseFiles);

  const allPaths = new Set([
    ...localMap.keys(),
    ...remoteMap.keys(),
    ...baseMap.keys(),
  ]);

  const safeToUpdate: FileEntry[] = [];
  const conflicts: ConflictedFile[] = [];
  const unchanged: string[] = [];
  const safeToDelete: string[] = [];

  for (const filePath of allPaths) {
    const local = localMap.get(filePath) ?? null;
    const remote = remoteMap.get(filePath) ?? null;
    const base = baseMap.get(filePath) ?? null;

    const localExists = local !== null;
    const remoteExists = remote !== null;
    const baseExists = base !== null;

    const localChanged = localExists !== baseExists || (localExists && local !== base);
    const remoteChanged = remoteExists !== baseExists || (remoteExists && remote !== base);

    if (!localChanged && !remoteChanged) {
      unchanged.push(filePath);
      continue;
    }

    if (localChanged && !remoteChanged) {
      if (localExists) {
        safeToUpdate.push({ path: filePath, content: local! });
      }
      continue;
    }

    if (!localChanged && remoteChanged) {
      unchanged.push(filePath);
      continue;
    }

    if (local === remote) {
      unchanged.push(filePath);
      continue;
    }

    let reason = "Modified both locally and remotely since last sync";
    if (!remoteExists && localExists) {
      reason = "Deleted remotely but modified locally since last sync";
    } else if (remoteExists && !localExists) {
      reason = "Deleted locally but modified remotely since last sync";
    }

    conflicts.push({
      path: filePath,
      localContent: local,
      remoteContent: remote,
      baseContent: base,
      reason,
    });
  }

  return { safeToUpdate, conflicts, unchanged, safeToDelete };
}

export function detectPullConflicts(
  localFiles: FileEntry[],
  remoteFiles: FileEntry[],
  baseFiles: FileEntry[]
): ConflictReport {
  const localMap = buildContentMap(localFiles);
  const remoteMap = buildContentMap(remoteFiles);
  const baseMap = buildContentMap(baseFiles);

  const allPaths = new Set([
    ...localMap.keys(),
    ...remoteMap.keys(),
    ...baseMap.keys(),
  ]);

  const safeToUpdate: FileEntry[] = [];
  const conflicts: ConflictedFile[] = [];
  const unchanged: string[] = [];
  const safeToDelete: string[] = [];

  for (const filePath of allPaths) {
    const local = localMap.get(filePath) ?? null;
    const remote = remoteMap.get(filePath) ?? null;
    const base = baseMap.get(filePath) ?? null;

    const localExists = local !== null;
    const remoteExists = remote !== null;
    const baseExists = base !== null;

    const localChanged = localExists !== baseExists || (localExists && local !== base);
    const remoteChanged = remoteExists !== baseExists || (remoteExists && remote !== base);

    if (!localChanged && !remoteChanged) {
      unchanged.push(filePath);
      continue;
    }

    if (remoteChanged && !localChanged) {
      if (remoteExists) {
        safeToUpdate.push({ path: filePath, content: remote! });
      } else {
        safeToDelete.push(filePath);
      }
      continue;
    }

    if (localChanged && !remoteChanged) {
      unchanged.push(filePath);
      continue;
    }

    if (local === remote) {
      unchanged.push(filePath);
      continue;
    }

    let reason = "Modified both locally and remotely since last sync";
    if (!remoteExists && localExists) {
      reason = "Deleted remotely but modified locally since last sync";
    } else if (remoteExists && !localExists) {
      reason = "Modified remotely but deleted locally since last sync";
    }

    conflicts.push({
      path: filePath,
      localContent: local,
      remoteContent: remote,
      baseContent: base,
      reason,
    });
  }

  return { safeToUpdate, conflicts, unchanged, safeToDelete };
}
