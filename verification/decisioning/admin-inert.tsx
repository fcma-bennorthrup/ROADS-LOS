export function GitHubSyncPanel({ open }: { open: boolean }) {
  if (open) throw new Error("Decisioning fixture must not open admin operations");
  return null;
}
