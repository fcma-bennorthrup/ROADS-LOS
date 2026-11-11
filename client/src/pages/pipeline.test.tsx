import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, expect, it, vi } from "vitest";
import PipelinePage from "./pipeline";
import { queryClient } from "@/lib/queryClient";
import { applicationStore } from "@/lib/loan-application-store";
import type { PipelineLoan } from "@shared/pipeline";
import { AppHeader } from "@/components/AppHeader";
import { MainNavigation } from "@/components/MainNavigation";
import { newLoanApplication } from "@shared/loan-factory";
import { getPipelineColumns, PipelineRowCells } from "@/components/pipeline-columns";
import { PIPELINE_QUEUES } from "@/lib/pipeline-display";

vi.mock("@/components/GitHubSyncPanel", () => ({ GitHubSyncPanel: ({ loanActive }: { loanActive: boolean }) => <span data-testid="sync-scope">{String(loanActive)}</span> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); queryClient.clear(); });
const loans: PipelineLoan[] = [
  { id: "first", loanNumber: "123456790", primaryBorrowerName: "Avery Wright", loanType: "Purchase", stage: "Closing", amountRequested: 145000, product: "Fixed", mode: "blend", revision: 1, createdAt: "2026-11-09T12:00:00Z", updatedAt: "2026-11-09T12:00:00Z" },
  { id: "second", loanNumber: "123456791", primaryBorrowerName: "", loanType: "", stage: "Customer Application", amountRequested: null, product: null, mode: "empty", revision: 0, createdAt: "2026-11-09T11:00:00Z", updatedAt: "2026-11-09T11:00:00Z" },
];
function view() {
  const location = memoryLocation({ path: "/pipeline", record: true });
  const rendered = render(<QueryClientProvider client={queryClient}><Router hook={location.hook}><PipelinePage /></Router></QueryClientProvider>);
  return { ...location, ...rendered };
}
const operationsHeaders = [
  "Loan Number", "CIF", "Region", "Borrower Name", "Loan Purpose", "Stage", "LO",
  "Closing Date", "Contract Exp Date", "TRID", "Decision", "Appraisal", "Title Work", "Actions",
];
const allHeaders = [
  "Loan Number", "CIF", "Region", "Borrower Name", "Loan Purpose", "Req Amount",
  "Stage", "LO", "App Start Date", "Decision", "Actions",
];
const salesHeaders = [
  ...allHeaders.slice(0, 8), "App Submit Date", "Contract Exp Date", "Decision", "Appraisal", "Actions",
];
const expectedHeaders = (queue: string) => queue === "Operations" ? operationsHeaders : queue === "Sales Support" ? salesHeaders : allHeaders;
it.each(["All Loans", "Sales Support"])("opens %s rows without making action icons navigate", async queue => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ ...loans[0], departmentQueue: "Sales Support" }]))));
  const { history } = view();
  await screen.findByTestId("pipeline-row-first");
  fireEvent.click(screen.getByTestId(`queue-${queue.toLowerCase().replaceAll(" ", "-")}`));
  const row = screen.getByTestId("pipeline-row-first");
  expect(within(row).queryByRole("link")).toBeNull();
  fireEvent.click(within(row).getByRole("button", { name: /Preview loan/ }));
  fireEvent.click(row.querySelector(".pipeline-row-actions")!);
  expect(history.at(-1)).toBe("/pipeline");
  fireEvent.click(within(row).getAllByRole("cell")[3]);
  expect(history.at(-1)).toBe("/loans/first");
});
it.each(["Enter", " "])("opens a focused loan row using %s", async key => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(loans))));
  const { history } = view();
  const row = await screen.findByTestId("pipeline-row-first");
  expect(row).toHaveAttribute("tabindex", "0");
  fireEvent.keyDown(row, { key });
  expect(history.at(-1)).toBe("/loans/first");
});
it("shows a newly created SF row on Pipeline even from a filtered empty department", async () => {
  let saved = [...loans];
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === "POST") {
      saved = [{ ...loans[0], id: "new-sf", primaryBorrowerName: "New Borrower",
        updatedAt: "2099-01-01T00:00:00Z", stage: "Customer Application" }, ...saved];
      return new Response(JSON.stringify({ id: "new-sf", loanNumber: "123456790" }), { status: 201 });
    }
    return new Response(JSON.stringify(saved));
  }));
  const { history } = view();
  await screen.findByTestId("pipeline-row-first");
  fireEvent.click(screen.getByTestId("queue-operations"));
  fireEvent.change(screen.getByPlaceholderText("Type to filter results"), { target: { value: "no match" } });
  fireEvent.click(screen.getByTestId("button-new-loan"));
  fireEvent.click(screen.getByTestId("confirm-new-loan"));
  expect(await screen.findByTestId("pipeline-row-new-sf")).toBeVisible();
  expect(screen.getByTestId("queue-all-loans")).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByPlaceholderText("Type to filter results")).toHaveValue("");
  expect(screen.queryByPlaceholderText("Search for a customer")).toBeNull();
  expect(history).toEqual(["/pipeline"]);
  expect(screen.queryByTestId("new-loan-dialog")).not.toBeInTheDocument();
});
it("expands navigation explicitly, exposes labels, and preserves queue data", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(loans))));
  view();
  await screen.findByTestId("pipeline-row-first");
  const nav = screen.getByRole("navigation", { name: "Main navigation" });
  fireEvent.mouseEnter(nav);
  expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
  expect(within(nav).getByText("ROADS")).toBeInTheDocument();
  expect(within(nav).getByText("Dashboard")).toBeInTheDocument();
  expect(within(nav).getByText("Saved items")).toBeInTheDocument();
  expect(within(nav).getByText("Reports")).toBeInTheDocument();
  expect(within(nav).getByRole("button", { name: /Dashboard — unavailable/ })).toBeDisabled();
  expect(screen.getAllByTestId(/^pipeline-row-/)).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));
  expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-expanded", "false");
  expect(within(nav).getByRole("img", { name: "Rural 1st" })).toBeInTheDocument();
});

it.each(PIPELINE_QUEUES)("aligns every %s header with its own cell renderer", queue => {
  // Render rows in isolation for restricted queues; this must not enable assignments.
  const loan: PipelineLoan = {
    ...loans[0], cifNumber: "654321", region: "502", additionalBorrowerCount: 2,
    loanOfficer: "Sarah Williams", applicationDate: "2026-10-14",
    contractExpiryDate: "2026-11-15", decision: "",
  };
  const columns = getPipelineColumns(queue);
  const values: Record<string, string> = {
    "Loan Number": "123456790", CIF: "654321", Region: "502",
    "Borrower Name": "Avery Wright+2", "Loan Purpose": "Purchase",
    "Req Amount": "$145,000.00", Stage: "Closing", LO: "Sarah Williams",
    "App Start Date": "10/14/2026", "App Submit Date": "—",
    "Contract Exp Date": "11/15/2026", Decision: "", Appraisal: "",
    "Closing Date": "", TRID: "", "Title Work": "", Actions: "",
  };
  render(<Router hook={memoryLocation().hook}><table>
    <thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
    <tbody><tr><PipelineRowCells columns={columns} loan={loan} /></tr></tbody>
  </table></Router>);
  const headers = screen.getAllByRole("columnheader").map(cell => cell.textContent);
  expect(headers).toEqual(expectedHeaders(queue));
  expect(new Set(columns.map(column => column.key)).size).toBe(columns.length);
  const cells = screen.getAllByRole("cell");
  expect(cells.map(cell => cell.textContent)).toEqual(expectedHeaders(queue).map(header => values[header]));
  const actions = within(cells.at(-1)!);
  expect(actions.queryByRole("link")).toBeNull();
  expect(actions.getByRole("button", { name: "Preview loan 123456790 — unavailable" })).toBeDisabled();
  expect(actions.getAllByRole("button")).toHaveLength(3);
  actions.getAllByRole("button").forEach(button => expect(button).toBeDisabled());
});

it.each(PIPELINE_QUEUES)("aligns %s loading cells and colgroup with its headers", queue => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
  view();
  fireEvent.click(screen.getByTestId(`queue-${queue.toLowerCase().replaceAll(" ", "-")}`));
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(expectedHeaders(queue));
  expect(screen.getByTestId("pipeline-table").querySelectorAll("col")).toHaveLength(expectedHeaders(queue).length);
  for (const row of screen.getAllByTestId(/^pipeline-skeleton-/)) {
    expect(within(row).getAllByRole("cell")).toHaveLength(expectedHeaders(queue).length);
  }
});

it("keeps Operations empty with its own exact columns when saved loans exist", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([
    { ...loans[0], departmentQueue: "Sales Support" }, loans[1],
  ]))));
  view();
  await screen.findByTestId("pipeline-row-first");
  fireEvent.click(screen.getByTestId("queue-operations"));
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(operationsHeaders);
  expect(screen.queryAllByTestId(/^pipeline-row-/)).toHaveLength(0);
  expect(screen.getByTestId("queue-operations")).toHaveTextContent("0 Loans");
  expect(screen.getByTestId("pipeline-empty")).toHaveTextContent("No loans assigned to Operations");
  expect(screen.queryByRole("button", { name: "Closing Date" })).toBeNull();
  fireEvent.change(screen.getByPlaceholderText("Type to filter results"), { target: { value: "Avery" } });
  fireEvent.click(screen.getByRole("button", { name: "Custom Filter" }));
  fireEvent.click(screen.getByTestId("filter-stage-closing"));
  expect(screen.queryAllByTestId(/^pipeline-row-/)).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "View All Loans" }));
  expect(screen.getAllByRole("columnheader")).toHaveLength(11);
  expect(screen.getAllByTestId(/^pipeline-row-/)).toHaveLength(2);
  fireEvent.click(screen.getByTestId("queue-sales-support"));
  expect(screen.getAllByRole("columnheader")).toHaveLength(13);
  expect(screen.getByTestId("pipeline-row-first")).toBeInTheDocument();
});
it("uses Operations skeleton columns and reports load failures instead of an empty success", async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
  view();
  fireEvent.click(screen.getByTestId("queue-operations"));
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(operationsHeaders);
  expect(within(screen.getByTestId("pipeline-skeleton-0")).getAllByRole("cell")).toHaveLength(14);
  expect(screen.queryByTestId("pipeline-empty")).toBeNull();
  await act(async () => { finish(new Response("Unavailable", { status: 503 })); });
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load");
  expect(screen.queryByTestId("pipeline-empty")).toBeNull();
});
it("shows saved opportunity fields and includes the same loan in Sales Support", async () => {
  const opportunity = { ...loans[0], region: "502", loanOfficer: "Sarah Williams",
    applicationDate: "2026-10-14", contractExpiryDate: "2026-11-15", decision: "", departmentQueue: "Sales Support" };
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([opportunity, loans[1]]))));
  view();
  await screen.findByTestId("pipeline-row-first");
  fireEvent.click(screen.getByTestId("queue-sales-support"));
  const cells = within(screen.getByTestId("pipeline-row-first")).getAllByRole("cell");
  expect(cells[2]).toHaveTextContent("502");
  expect(cells[7]).toHaveTextContent("Sarah Williams");
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual([
    "Loan Number", "CIF", "Region", "Borrower Name", "Loan Purpose", "Req Amount", "Stage", "LO",
    "App Submit Date", "Contract Exp Date", "Decision", "Appraisal", "Actions",
  ]);
  expect(cells).toHaveLength(13);
  expect(cells[8]).toHaveTextContent("—");
  expect(cells[9]).toHaveTextContent("11/15/2026");
  expect(cells[10]).toBeEmptyDOMElement();
  expect(cells[11]).toBeEmptyDOMElement();
  expect(screen.queryByTestId("pipeline-row-second")).toBeNull();
  expect(screen.getByTestId("queue-sales-support")).toHaveTextContent("1 Loans");
  fireEvent.click(screen.getByTestId("queue-all-loans"));
  expect(screen.queryByRole("columnheader", { name: "Contract Exp Date" })).toBeNull();
  expect(within(screen.getByTestId("pipeline-row-first")).getAllByRole("cell")[8]).toHaveTextContent("10/14/2026");
  expect(screen.getByTestId("pipeline-row-second")).toBeInTheDocument();
});
it("uses only the index projection, filters with counts, sorts, and links to loans", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(loans))));
  const install = vi.spyOn(applicationStore, "install");
  const { history } = view();
  await screen.findByTestId("pipeline-row-first");
  expect(fetch).toHaveBeenCalledWith("/api/loans", expect.objectContaining({ credentials: "include" }));
  expect(install).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Custom Filter" }));
  expect(screen.getByTestId("filter-stage-closing")).toHaveTextContent("Closing 1");
  fireEvent.click(screen.getByTestId("filter-stage-closing"));
  expect(screen.queryByTestId("pipeline-row-second")).toBeNull();
  fireEvent.click(screen.getByTestId("filter-stage-customer-application"));
  expect(screen.getByTestId("pipeline-row-second")).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Type to filter results"), { target: { value: "WRIGHT" } });
  expect(screen.queryByTestId("pipeline-row-second")).toBeNull();
  fireEvent.change(screen.getByPlaceholderText("Type to filter results"), { target: { value: "missing" } });
  expect(screen.getByTestId("pipeline-empty")).toHaveTextContent("No loans match");
  fireEvent.click(screen.getByTestId("clear-pipeline-filters"));
  fireEvent.click(screen.getByTestId("sort-loanNumber"));
  fireEvent.click(screen.getByTestId("sort-loanNumber"));
  expect(within(screen.getByTestId("pipeline-table")).getAllByRole("row")[1]).toHaveAttribute("data-loan", "second");
  const cells = within(screen.getByTestId("pipeline-row-first")).getAllByRole("cell");
  expect(cells[8]).toHaveTextContent("—");
  expect(cells[8].firstChild).toHaveAttribute("aria-label", "Application start date is not available in the saved pipeline data.");
  fireEvent.click(screen.getByTestId("pipeline-row-first"));
  expect(history.at(-1)).toBe("/loans/first");
});
it("renders the exact Figma columns and real queue counts without fabricating assignments", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(loans))));
  view();
  await screen.findByTestId("pipeline-row-first");
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual([
    "Loan Number", "CIF", "Region", "Borrower Name", "Loan Purpose", "Req Amount", "Stage", "LO", "App Start Date", "Decision", "Actions",
  ]);
  expect(screen.getByTestId("queue-all-loans")).toHaveTextContent("2 Loans");
  expect(screen.queryByTestId("queue-credit")).not.toBeInTheDocument();
  expect(screen.queryByTestId("queue-quality-control")).not.toBeInTheDocument();
  for (const department of ["sales-support", "operations"]) {
    expect(screen.getByTestId(`queue-${department}`)).toHaveTextContent("0 Loans");
    fireEvent.click(screen.getByTestId(`queue-${department}`));
    expect(screen.getByTestId("pipeline-empty")).toHaveTextContent(department === "sales-support" ? "New SF Opportunities appear here" : "Department queue assignment has not been configured");
    expect(screen.queryByTestId("pipeline-row-first")).toBeNull();
  }
  fireEvent.click(screen.getByRole("button", { name: "View All Loans" }));
  expect(screen.getByTestId("pipeline-row-first")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Reports — unavailable/ })).toBeDisabled();
});
it("paginates real rows, resets the page on filtering and supports the table result search", async () => {
  const many = Array.from({ length: 23 }, (_, index) => ({ ...loans[0], id: `loan-${index}`, loanNumber: String(100000000 + index), primaryBorrowerName: `Borrower ${index}` }));
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(many))));
  view();
  await screen.findByTestId("pipeline-row-loan-0");
  expect(screen.getAllByTestId(/^pipeline-row-/)).toHaveLength(20);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getAllByTestId(/^pipeline-row-/)).toHaveLength(3);
  expect(screen.getByRole("status")).toHaveTextContent("Page 2 of 2");
  fireEvent.change(screen.getByRole("searchbox", { name: "Filter table results" }), { target: { value: "Borrower 22" } });
  expect(screen.getAllByTestId(/^pipeline-row-/)).toHaveLength(1);
  expect(screen.getByRole("status")).toHaveTextContent("Page 1 of 1");
});
it("preserves new loan and prototype admin entry points on Pipeline", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(loans))));
  view();
  await screen.findByTestId("pipeline-row-first");
  fireEvent.click(screen.getByTestId("button-new-loan"));
  expect(screen.getByTestId("source-sf")).toBeChecked();
  expect(screen.getByTestId("source-blend")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("cancel-new-loan"));
  fireEvent.click(screen.getByTestId("button-more-options"));
  expect(screen.getByTestId("menu-item-prototype-admin")).toBeInTheDocument();
  expect(screen.queryByTestId("menu-item-debug")).toBeNull();
});
it("shows only saved CIF and additional borrower fields", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ ...loans[0], cifNumber: "654123", additionalBorrowerCount: 2 }]))));
  view();
  const row = await screen.findByTestId("pipeline-row-first");
  expect(within(row).getByText("654123")).toBeInTheDocument();
  expect(within(row).getByLabelText("2 additional borrowers")).toHaveTextContent("+2");
  fireEvent.change(screen.getByPlaceholderText("Type to filter results"), { target: { value: "654123" } });
  expect(screen.getByTestId("pipeline-row-first")).toBeInTheDocument();
});
it("guards the loan workspace rail against leaving with unsaved edits", async () => {
  applicationStore.install(newLoanApplication({ id: "guard-rail", loanNumber: "123456799", source: "blank", borrowerCount: 1 }));
  applicationStore.markDraft("rail-guard", true);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const location = memoryLocation({ path: "/loans/guard-rail", record: true });
  render(<Router hook={location.hook}><MainNavigation loanActive /></Router>);
  await act(async () => { fireEvent.click(screen.getByTestId("main-nav-pipeline")); });
  expect(confirm).toHaveBeenCalled();
  expect(location.history.at(-1)).toBe("/loans/guard-rail");
  confirm.mockReturnValue(true);
  await act(async () => { fireEvent.click(screen.getByTestId("main-nav-pipeline")); });
  expect(location.history.at(-1)).toBe("/pipeline");
  applicationStore.markDraft("rail-guard", false);
});
it("provides skeleton, retry and true-empty states", async () => {
  let finish!: (response: Response) => void;
  const response = new Promise<Response>(resolve => { finish = resolve; });
  vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(response).mockResolvedValue(new Response("[]")));
  view();
  expect(screen.getAllByTestId(/pipeline-skeleton-/)).toHaveLength(6);
  await act(async () => { finish(new Response("Unavailable", { status: 503 })); });
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the pipeline");
  fireEvent.click(screen.getByTestId("button-retry-pipeline"));
  expect(await screen.findByTestId("pipeline-empty")).toHaveTextContent("No loans yet — create the first one");
});
it("app header exposes sync but never loan demo or Debug even with an old active document", async () => {
  const location = memoryLocation({ path: "/pipeline" });
  render(<QueryClientProvider client={queryClient}><Router hook={location.hook}><AppHeader /></Router></QueryClientProvider>);
  fireEvent.click(screen.getByTestId("button-more-options"));
  expect(screen.getByTestId("menu-item-prototype-admin")).toBeInTheDocument();
  expect(screen.queryByTestId("menu-item-debug")).toBeNull();
  expect(screen.getByTestId("sync-scope")).toHaveTextContent("false");
});
