import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OperationsTeamDialog } from "./OperationsTeamDialog";
import { LoanTeamDialog } from "./LoanTeamDialog";
import { newLoanApplication } from "@shared/loan-factory";
import { operationsTeamSchema } from "@shared/operations-team";
import { pipelineView } from "@shared/pipeline";
import { queryClient } from "@/lib/queryClient";

afterEach(() => { cleanup(); queryClient.clear(); vi.unstubAllGlobals(); });
it("saves, edits and clears optional secondary with version checks and team visibility", async () => {
  let document = newLoanApplication({ id: "team-test", loanNumber: "123456799", source: "blank", borrowerCount: 1 });
  document.sections["closing-details"] = { closingDate: "11/25/2026" };
  const writes: any[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
    if (init?.method === "PUT") {
      const body = JSON.parse(init.body); writes.push(body);
      expect(body.revision).toBe(document.revision);
      document = { ...document, revision: document.revision + 1, sections: { ...document.sections, [body.section]: body.value } };
    }
    return new Response(JSON.stringify(document));
  }));
  queryClient.setQueryData(["/api/loans"], [pipelineView(document)]);
  const view = render(<OperationsTeamDialog loan={pipelineView(document)} />);
  fireEvent.click(screen.getByRole("button", { name: /Edit Operations/ }));
  await waitFor(() => expect(screen.getByLabelText("Operations Primary")).toBeEnabled());
  expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Operations Primary"), { target: { value: "Megann Ziedes" } });
  fireEvent.change(screen.getByLabelText("Operations Secondary"), { target: { value: "Megann Ziedes" } });
  expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Operations Secondary"), { target: { value: "Taylor Beckham" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(writes[0]).toMatchObject({ section: "operations-team", value: { primary: "Megann Ziedes", secondary: "Taylor Beckham" } });
  expect(document.sections["closing-details"]).toEqual({ closingDate: "11/25/2026" });
  expect(queryClient.getQueryData<any[]>(["/api/loans"])?.[0].operationsTeam.primary).toBe("Megann Ziedes");
  view.rerender(<OperationsTeamDialog loan={pipelineView(document)} />);
  expect(screen.getByRole("button", { name: /Edit Operations/ })).not.toHaveClass("pipeline-operations-assignment");
  fireEvent.click(screen.getByRole("button", { name: /Edit Operations/ }));
  await waitFor(() => expect(screen.getByLabelText("Operations Primary")).toHaveValue("Megann Ziedes"));
  fireEvent.change(screen.getByLabelText("Operations Primary"), { target: { value: "Hajar Bonnett" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: /Edit Operations/ }));
  await waitFor(() => expect(screen.getByLabelText("Operations Primary")).toHaveValue("Megann Ziedes"));
  fireEvent.change(screen.getByLabelText("Operations Primary"), { target: { value: "Hajar Bonnett" } });
  fireEvent.change(screen.getByLabelText("Operations Secondary"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  view.unmount();
  render(<LoanTeamDialog loanNumber="123456799" operationsTeam={pipelineView(document).operationsTeam} />);
  fireEvent.click(screen.getByRole("button", { name: /View loan team/ }));
  expect(screen.getByLabelText("Operations Primary")).toHaveValue("Hajar Bonnett");
  expect(screen.getByLabelText("Operations Secondary")).toHaveValue("Not Assigned");
});
it("keeps failed saves open without updating the claimed icon or cached assignments", async () => {
  const document = newLoanApplication({ id: "team-fail", loanNumber: "123456798", source: "blank", borrowerCount: 1 });
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => init?.method === "PUT"
    ? new Response(JSON.stringify({ error: "Loan changed. Reload before saving." }), { status: 409 })
    : new Response(JSON.stringify(document))));
  render(<OperationsTeamDialog loan={pipelineView(document)} />);
  fireEvent.click(screen.getByRole("button", { name: /Edit Operations/ }));
  await waitFor(() => expect(screen.getByLabelText("Operations Primary")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Operations Primary"), { target: { value: "Megann Ziedes" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Loan changed");
  expect(screen.getByLabelText("Operations Primary")).toHaveValue("Megann Ziedes");
  expect(document.sections["operations-team"]).toBeUndefined();
});
it("validates assignment choices in the shared server contract", () => {
  expect(operationsTeamSchema.safeParse({ primary: "", secondary: "Megann Ziedes" }).success).toBe(false);
  expect(operationsTeamSchema.safeParse({ primary: "Unknown", secondary: "" }).success).toBe(false);
  expect(operationsTeamSchema.safeParse({ primary: "Megann Ziedes", secondary: "Megann Ziedes" }).success).toBe(false);
  expect(operationsTeamSchema.safeParse({ primary: "Megann Ziedes", secondary: "" }).success).toBe(true);
});
