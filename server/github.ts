import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

export async function githubRequest(endpoint: string, options: { method?: string; body?: any } = {}) {
  const response = await connectors.proxy("github", endpoint, {
    method: options.method || "GET",
    ...(options.body ? { body: JSON.stringify(options.body), headers: { "Content-Type": "application/json" } } : {}),
  });
  const text = await response.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`GitHub API returned non-JSON (status ${response.status}): ${text.substring(0, 200)}`);
  }
  if (!response.ok) {
    const msg = parsed?.message || text.substring(0, 200);
    throw new Error(`GitHub API error ${response.status} on ${options.method || "GET"} ${endpoint}: ${msg}`);
  }
  return parsed;
}

export async function getAuthenticatedUser() {
  return githubRequest("/user");
}

export async function getRepository(owner: string, repo: string) {
  return githubRequest(`/repos/${owner}/${repo}`);
}

export async function createRepository(name: string, options: { description?: string; isPrivate?: boolean } = {}) {
  return githubRequest("/user/repos", {
    method: "POST",
    body: {
      name,
      description: options.description || "",
      private: options.isPrivate ?? true,
      auto_init: true,
    },
  });
}

export async function listRepositories() {
  return githubRequest("/user/repos?sort=updated&per_page=10");
}

export async function pushCodebaseWithDeletions(
  owner: string,
  repo: string,
  files: { path: string; content: string; encoding?: "utf-8" | "base64" }[],
  deletions: string[],
  message: string
) {
  const ref = await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/main`);
  if (!ref.object?.sha) throw new Error(`Could not get ref for ${owner}/${repo}: ${JSON.stringify(ref)}`);
  const currentCommitSha = ref.object.sha;
  const currentCommit = await githubRequest(`/repos/${owner}/${repo}/git/commits/${currentCommitSha}`);
  const baseTreeSha = currentCommit.tree.sha;

  const treeItems: { path: string; mode: string; type: string; sha: string | null }[] = [];
  const skippedFiles: { path: string; reason: string }[] = [];

  for (const file of files) {
    const base64Content = file.encoding === "base64"
      ? file.content
      : Buffer.from(file.content).toString("base64");
    try {
      const blob = await githubRequest(`/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        body: {
          content: base64Content,
          encoding: "base64",
        },
      });
      if (!blob.sha) {
        console.error(`Blob creation failed for ${file.path}:`, blob);
        skippedFiles.push({ path: file.path, reason: "no sha returned" });
        continue;
      }
      treeItems.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("413") || /too large|payload/i.test(msg)) {
        console.warn(`Skipping ${file.path}: too large for GitHub API (${base64Content.length} base64 bytes)`);
        skippedFiles.push({ path: file.path, reason: "too large for GitHub API" });
        continue;
      }
      throw err;
    }
  }

  for (const delPath of deletions) {
    treeItems.push({
      path: delPath,
      mode: "100644",
      type: "blob",
      sha: null,
    });
  }

  if (treeItems.length === 0) {
    return { commitSha: currentCommitSha, message: "No changes to push", filesCount: 0, skippedFiles };
  }

  const tree = await githubRequest(`/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: { base_tree: baseTreeSha, tree: treeItems },
  });
  if (!tree.sha) throw new Error(`Tree creation failed: ${JSON.stringify(tree)}`);

  const commit = await githubRequest(`/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: {
      message,
      tree: tree.sha,
      parents: [currentCommitSha],
    },
  });
  if (!commit.sha) throw new Error(`Commit creation failed: ${JSON.stringify(commit)}`);

  await githubRequest(`/repos/${owner}/${repo}/git/refs/heads/main`, {
    method: "PATCH",
    body: { sha: commit.sha },
  });

  return { commitSha: commit.sha, message: commit.message, filesCount: files.length - skippedFiles.length, deletedCount: deletions.length, skippedFiles };
}

export async function pushCodebase(owner: string, repo: string, files: { path: string; content: string; encoding?: "utf-8" | "base64" }[], message: string) {
  const ref = await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/main`);
  if (!ref.object?.sha) throw new Error(`Could not get ref for ${owner}/${repo}: ${JSON.stringify(ref)}`);
  const currentCommitSha = ref.object.sha;
  const currentCommit = await githubRequest(`/repos/${owner}/${repo}/git/commits/${currentCommitSha}`);
  const baseTreeSha = currentCommit.tree.sha;

  const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
  const skippedFiles: { path: string; reason: string }[] = [];
  for (const file of files) {
    const base64Content = file.encoding === "base64"
      ? file.content
      : Buffer.from(file.content).toString("base64");
    try {
      const blob = await githubRequest(`/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        body: {
          content: base64Content,
          encoding: "base64",
        },
      });
      if (!blob.sha) {
        console.error(`Blob creation failed for ${file.path}:`, blob);
        skippedFiles.push({ path: file.path, reason: "no sha returned" });
        continue;
      }
      treeItems.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("413") || /too large|payload/i.test(msg)) {
        console.warn(`Skipping ${file.path}: too large for GitHub API (${base64Content.length} base64 bytes)`);
        skippedFiles.push({ path: file.path, reason: "too large for GitHub API" });
        continue;
      }
      throw err;
    }
  }

  if (treeItems.length === 0) throw new Error("No files to push");

  const tree = await githubRequest(`/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: { base_tree: baseTreeSha, tree: treeItems },
  });
  if (!tree.sha) throw new Error(`Tree creation failed: ${JSON.stringify(tree)}`);

  const commit = await githubRequest(`/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: {
      message,
      tree: tree.sha,
      parents: [currentCommitSha],
    },
  });
  if (!commit.sha) throw new Error(`Commit creation failed: ${JSON.stringify(commit)}`);

  await githubRequest(`/repos/${owner}/${repo}/git/refs/heads/main`, {
    method: "PATCH",
    body: { sha: commit.sha },
  });

  return { commitSha: commit.sha, message: commit.message, filesCount: treeItems.length };
}

export async function getRepoTree(owner: string, repo: string, branch: string = "main") {
  const ref = await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  const commitSha = ref.object.sha;
  const commit = await githubRequest(`/repos/${owner}/${repo}/git/commits/${commitSha}`);
  const tree = await githubRequest(`/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`);
  return { commitSha, tree: tree.tree };
}

export async function getRepoTreeAtCommit(owner: string, repo: string, commitSha: string) {
  const commit = await githubRequest(`/repos/${owner}/${repo}/git/commits/${commitSha}`);
  const tree = await githubRequest(`/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`);
  return { commitSha, tree: tree.tree };
}

export async function getFileContent(owner: string, repo: string, filePath: string, ref: string = "main") {
  const response = await githubRequest(`/repos/${owner}/${repo}/contents/${filePath}?ref=${ref}`);
  if (response.encoding === "base64" && response.content) {
    return Buffer.from(response.content, "base64").toString("utf-8");
  }
  return null;
}

export async function getFileContentAtCommit(owner: string, repo: string, filePath: string, commitSha: string): Promise<string | null> {
  try {
    const response = await githubRequest(`/repos/${owner}/${repo}/contents/${filePath}?ref=${commitSha}`);
    if (response.encoding === "base64" && response.content) {
      return Buffer.from(response.content, "base64").toString("utf-8");
    }
    return null;
  } catch (err: any) {
    if (err.message?.includes("404")) {
      return null;
    }
    throw err;
  }
}
