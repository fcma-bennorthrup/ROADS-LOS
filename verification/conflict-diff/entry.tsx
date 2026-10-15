import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConflictResolutionDialog } from "@/components/ConflictResolutionDialog";

const pairs: Array<[string | null, string | null]> = [
  [null, null], ["", ""], [null, "remote\n"], ["local\n", null],
  ["same\nleft\n", "same\nright"], ["a", "a\nb\nc"],
  [Array.from({ length: 400 }, (_, i) => `row ${i} ${"x".repeat(120)}`).join("\n"),
   Array.from({ length: 403 }, (_, i) => `row ${i} ${"y".repeat(120)}`).join("\n")],
];
const data = {
  hasConflicts: true, operation: "pull" as const,
  conflicts: pairs.map(([localContent, remoteContent], i) => ({
    path: `synthetic/file-${i}.txt`, reason: "Both modified",
    localContent, remoteContent, baseContent: null,
  })),
};
const deny = () => { throw Error("EXTERNAL_OPERATION_BLOCKED"); };
window.fetch = deny;
window.open = deny;
XMLHttpRequest.prototype.open = deny;
window.WebSocket = class { constructor() { deny(); } } as any;
const client = new QueryClient({ defaultOptions: {
  queries: { queryFn: deny, retry: false, refetchOnWindowFocus: false },
  mutations: { mutationFn: deny, retry: false },
} });
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <ConflictResolutionDialog open onOpenChange={() => {}} conflictsData={data} />
  </QueryClientProvider>,
);
