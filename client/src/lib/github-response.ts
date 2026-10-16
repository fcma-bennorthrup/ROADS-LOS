/** Do not retry sync writes automatically: a lost response does not imply a failed write. */
export async function readGitHubSyncResponse(res: Response): Promise<Record<string, any>> {
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    const status = `HTTP ${res.status}`;
    throw new Error(
      `GitHub sync received a non-JSON response (${status}) from the app or gateway. ` +
      "The operation could not be confirmed. Check sync status and pending conflicts before retrying.",
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(`GitHub sync received an invalid response (HTTP ${res.status}).`);
  }
  return body as Record<string, any>;
}
