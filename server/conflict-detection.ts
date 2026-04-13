export interface FileEntry {
  path: string;
  content: string;
}

export interface ConflictReport {
  safeToUpdate: FileEntry[];
  conflicts: ConflictedFile[];
  unchanged: string[];
}

export interface ConflictedFile {
  path: string;
  localContent: string;
  remoteContent: string;
  baseContent: string | null;
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
  const remoteMap = buildContentMap(remoteFiles);
  const baseMap = buildContentMap(baseFiles);

  const safeToUpdate: FileEntry[] = [];
  const conflicts: ConflictedFile[] = [];
  const unchanged: string[] = [];

  for (const localFile of localFiles) {
    const remoteContent = remoteMap.get(localFile.path);
    const baseContent = baseMap.get(localFile.path) ?? null;

    const localChanged = baseContent === null || localFile.content !== baseContent;
    const remoteChanged = remoteContent !== undefined && remoteContent !== (baseContent ?? undefined) && remoteContent !== localFile.content;

    if (!localChanged) {
      unchanged.push(localFile.path);
    } else if (remoteChanged) {
      conflicts.push({
        path: localFile.path,
        localContent: localFile.content,
        remoteContent: remoteContent!,
        baseContent,
      });
    } else {
      safeToUpdate.push(localFile);
    }
  }

  return { safeToUpdate, conflicts, unchanged };
}

export function detectPullConflicts(
  localFiles: FileEntry[],
  remoteFiles: FileEntry[],
  baseFiles: FileEntry[]
): ConflictReport {
  const localMap = buildContentMap(localFiles);
  const baseMap = buildContentMap(baseFiles);

  const safeToUpdate: FileEntry[] = [];
  const conflicts: ConflictedFile[] = [];
  const unchanged: string[] = [];

  for (const remoteFile of remoteFiles) {
    const localContent = localMap.get(remoteFile.path);
    const baseContent = baseMap.get(remoteFile.path) ?? null;

    if (localContent === undefined) {
      safeToUpdate.push(remoteFile);
      continue;
    }

    if (remoteFile.content === localContent) {
      unchanged.push(remoteFile.path);
      continue;
    }

    const localChanged = baseContent !== null && localContent !== baseContent;
    const remoteChanged = baseContent !== null && remoteFile.content !== baseContent;

    if (baseContent === null) {
      if (localContent !== remoteFile.content) {
        conflicts.push({
          path: remoteFile.path,
          localContent,
          remoteContent: remoteFile.content,
          baseContent: null,
        });
      } else {
        unchanged.push(remoteFile.path);
      }
    } else if (localChanged && remoteChanged) {
      conflicts.push({
        path: remoteFile.path,
        localContent,
        remoteContent: remoteFile.content,
        baseContent,
      });
    } else if (remoteChanged && !localChanged) {
      safeToUpdate.push(remoteFile);
    } else {
      unchanged.push(remoteFile.path);
    }
  }

  return { safeToUpdate, conflicts, unchanged };
}
