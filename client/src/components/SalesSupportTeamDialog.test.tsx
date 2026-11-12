import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OperationsTeamDialog } from "./OperationsTeamDialog";
import { LoanTeamDialog } from "./LoanTeamDialog";
import { newLoanApplication } from "@shared/loan-factory";
import { pipelineView } from "@shared/pipeline";
import { defaultSalesSupport, salesSupportTeamSchema } from "@shared/sales-support-team";
import { queryClient } from "@/lib/queryClient";

afterEach(() => { cleanup(); queryClient.clear(); vi.unstubAllGlobals(); });
it.each([
  ["Sarah Williams", "Tyler Coke"], ["Rylee Alcorn", "Matthew Lewis"],
  ["Connor Welch", "Nikki Wheat"], ["Conner Welch", "Nikki Wheat"], ["Unknown", ""],
])("preserves the default for %s", (officer, primary) => {
  expect(defaultSalesSupport(officer)).toBe(primary);
});
it("loads defaults, saves overrides and updates All Loans without changing Operations", async () => {
  let document = newLoanApplication({ id: "support-test", loanNumber: "123456799", source: "blank", borrowerCount: 1 });
  document.meta!.opportunity = { loanOfficer: "Sarah Williams", region: "500", applicationDate: "2026-11-12", queue: "Sales Support", decision: "" };
  document.sections["operations-team"] = { primary: "Megann Ziedes", secondary: "" };
  let fail = false;
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
    if (init?.method === "PUT") {
      if (fail) return new Response(JSON.stringify({ error: "Loan changed. Reload." }), { status: 409 });
      const body = JSON.parse(init.body);
      expect(body.section).toBe("sales-support-team");
      expect(body.revision).toBe(document.revision);
      document = { ...document, revision: document.revision + 1, sections: { ...document.sections, [body.section]: body.value } };
    }
    return new Response(JSON.stringify(document));
  }));
  const view = render(<OperationsTeamDialog role="Sales Support" loan={pipelineView(document)} />);
  const open = () => fireEvent.click(screen.getByRole("button", { name: /Edit Sales Support/ }));
  open();
  await waitFor(() => expect(screen.getByLabelText("Sales Support Primary")).toHaveValue("Tyler Coke"));
  fireEvent.change(screen.getByLabelText("Sales Support Primary"), { target: { value: "Nikki Wheat" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  open();
  await waitFor(() => expect(screen.getByLabelText("Sales Support Primary")).toHaveValue("Tyler Coke"));
  fireEvent.change(screen.getByLabelText("Sales Support Primary"), { target: { value: "Nikki Wheat" } });
  fireEvent.change(screen.getByLabelText("Sales Support Secondary"), { target: { value: "Nikki Wheat" } });
  expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Sales Support Secondary"), { target: { value: "Matthew Lewis" } });
  fail = true;
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Loan changed");
  expect(document.sections["sales-support-team"]).toBeUndefined();
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.sections["operations-team"]).toEqual({ primary: "Megann Ziedes", secondary: "" });
  open();
  await waitFor(() => expect(screen.getByLabelText("Sales Support Primary")).toHaveValue("Nikki Wheat"));
  expect(screen.getByLabelText("Sales Support Secondary")).toHaveValue("Matthew Lewis");
  fireEvent.change(screen.getByLabelText("Sales Support Secondary"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  view.unmount();
  render(<LoanTeamDialog loanNumber={document.loan.loanNumber} loanOfficer="Sarah Williams" salesSupportTeam={pipelineView(document).salesSupportTeam} />);
  fireEvent.click(screen.getByRole("button", { name: /View loan team/ }));
  expect(screen.getByLabelText("Sales Support Primary")).toHaveValue("Nikki Wheat");
  expect(screen.getByLabelText("Sales Support Secondary")).toHaveValue("Not Assigned");
});
it("rejects duplicates, missing primaries and names outside Sales Support", () => {
  for (const team of [
    { primary: "", secondary: "Tyler Coke" }, { primary: "Tyler Coke", secondary: "Tyler Coke" },
    { primary: "Megann Ziedes", secondary: "" },
  ]) expect(salesSupportTeamSchema.safeParse(team).success).toBe(false);
  expect(salesSupportTeamSchema.safeParse({ primary: "Tyler Coke", secondary: "" }).success).toBe(true);
});
