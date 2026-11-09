import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DatabaseCompatibilityStatus } from "./DatabaseCompatibilityStatus";
import { readDatabaseCompatibility } from "@/lib/database-compatibility";
vi.mock("@/lib/database-compatibility", () => ({
  DATABASE_COMPATIBILITY_KEY: ["/api/database/compatibility"],
  readDatabaseCompatibility: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("shows pending development setup and reruns only the read-only check", async () => {
  vi.mocked(readDatabaseCompatibility).mockResolvedValue({
    status: "needs-upgrade", message: "Run npm run db:upgrade:dev, then npm run db:check.",
    pending: ["001-loan-table"], issues: [], documentVersion: 1, checkedLoans: 0,
  });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <DatabaseCompatibilityStatus open />
  </QueryClientProvider>);
  expect(await screen.findByText(/Pending updates: 001-loan-table/)).toBeInTheDocument();
  expect(screen.getByText(/Run npm run db:upgrade:dev/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Check again" }));
  await waitFor(() => expect(readDatabaseCompatibility).toHaveBeenCalledTimes(2));
  expect(screen.getAllByRole("button")).toHaveLength(1);
});
it("does not check while the panel is closed", () => {
  render(<QueryClientProvider client={new QueryClient()}><DatabaseCompatibilityStatus open={false} /></QueryClientProvider>);
  expect(readDatabaseCompatibility).not.toHaveBeenCalled();
});
