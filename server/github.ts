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
