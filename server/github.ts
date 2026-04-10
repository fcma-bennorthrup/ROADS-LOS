import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

export async function githubRequest(endpoint: string, options: { method?: string; body?: any } = {}) {
  const response = await connectors.proxy("github", endpoint, {
    method: options.method || "GET",
    ...(options.body ? { body: JSON.stringify(options.body), headers: { "Content-Type": "application/json" } } : {}),
  });
  return response.json();
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

export async function pushCodebase(owner: string, repo: string, files: { path: string; content: string }[], message: string) {
  const ref = await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/main`);
  const currentCommitSha = ref.object.sha;
  const currentCommit = await githubRequest(`/repos/${owner}/${repo}/git/commits/${currentCommitSha}`);
  const baseTreeSha = currentCommit.tree.sha;

  const treeItems = [];
  for (const file of files) {
    const blob = await githubRequest(`/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      body: {
        content: Buffer.from(file.content).toString("base64"),
        encoding: "base64",
      },
    });
    treeItems.push({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  const tree = await githubRequest(`/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: { base_tree: baseTreeSha, tree: treeItems },
  });

  const commit = await githubRequest(`/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: {
      message,
      tree: tree.sha,
      parents: [currentCommitSha],
    },
  });

  await githubRequest(`/repos/${owner}/${repo}/git/refs/heads/main`, {
    method: "PATCH",
    body: { sha: commit.sha },
  });

  return { commitSha: commit.sha, message: commit.message, filesCount: files.length };
}
