import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { RoutedDocumentsFixture, loan, record, FIXED_TIME } from "./fixture";
import { queryClient } from "../../client/src/lib/queryClient";
import { closingDisclosureStorageKey as cdKey, loadClosingDisclosures } from "../../client/src/lib/closing-disclosure-history";
import { closingPackageStorageKey as packageKey } from "../../client/src/lib/closing-package-progress";
import cdPdf from "@assets/SampleCD_1777397678654.pdf";
import packagePdf from "@assets/Redacted-ClosingPackage_Redacted_1777397693832.pdf";

const click = (id: string) => fireEvent.click(screen.getByTestId(id));
const closing = () => click("nav-item-closing-documents");
const tab = (name: string) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const seed = (id = "one") => localStorage.setItem(cdKey(id), JSON.stringify([record, { ...record, id: 2 }]));
function mount(id = "one") {
  const location = memoryLocation({ path: `/loans/${id}/documents` });
  render(<RoutedDocumentsFixture hook={location.hook} />);
  return (path: string) => act(() => location.navigate(path));
}
async function ready(id = "one", empty = false) {
  queryClient.setQueryData(["/api/loans", id], loan(id, empty));
  const navigate = mount(id);
  await advance(0);
  return navigate;
}
beforeEach(() => {
  queryClient.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FIXED_TIME));
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
});
afterEach(() => {
  cleanup(); queryClient.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
});

describe("actual Documents route, providers and overlays", () => {
  it.each(["404", "invalid", "null", "success", "empty"])("deferred %s response preserves query and shell contract", async (mode) => {
    let resolve!: (response: Response) => void;
    const transport = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal("fetch", transport);
    mount();
    expect(screen.getByTestId("loading-state")).toHaveTextContent("Loading loan details...");
    expect(screen.queryByTestId("loan-documents-page")).not.toBeInTheDocument();
    expect(transport).toHaveBeenCalledExactlyOnceWith("/api/loans/one", { credentials: "include" });
    await act(async () => resolve(new Response(mode === "404" ? "missing" : mode === "invalid" ? "<html>" :
      JSON.stringify(mode === "null" ? null : loan("one", mode === "empty")), { status: mode === "404" ? 404 : 200 })));
    await advance(100);
    if (["404", "invalid", "null"].includes(mode)) {
      expect(screen.getByTestId("error-state")).toHaveTextContent("Failed to load loan data");
      expect(screen.queryByTestId("side-nav")).not.toBeInTheDocument();
    } else {
      expect(screen.getByTestId("loan-documents-page")).toBeInTheDocument();
      expect(screen.getByTestId("disclosures-content")).toBeInTheDocument();
      if (mode === "empty") {
        seed(); closing(); click("button-edit-closing-disclosure-1");
        expect(screen.getByText("No borrowers to track")).toBeInTheDocument();
        expect(screen.getByTestId("button-save-borrower-edit-1")).toBeDisabled();
      }
    }
    await advance(30000);
    expect(transport).toHaveBeenCalledTimes(1);
    // The real header mounts a disabled sync-status observer even while its
    // admin panel is closed. Preserve that cache entry, but never its transport.
    expect(queryClient.getQueryCache().getAll().map(q => q.queryKey)).toEqual(
      ["success", "empty"].includes(mode)
        ? [["/api/loans", "one"], ["/api/github/sync-status"]]
        : [["/api/loans", "one"]],
    );
    expect(queryClient.getDefaultOptions().queries).toMatchObject({ staleTime: Infinity, retry: false, refetchOnWindowFocus: false, refetchInterval: false });
  });

  it.each(["sidebar", "route"])("cancels local/CD work but resumes package deadline across %s", async (mode) => {
    const navigate = await ready();
    click("button-generate-at-app-disclosures");
    await advance(2000);
    closing();
    await advance(5000);
    click("nav-item-disclosures");
    expect(screen.getByTestId("text-at-app-disclosures-status")).not.toHaveTextContent("Last Generated");
    closing();
    click("button-generate-closing-disclosure");
    tab("Closing Package"); fireEvent.click(screen.getByRole("button", { name: "Generate Closing Package" }));
    const pending = JSON.parse(localStorage.getItem(packageKey("one"))!);
    await advance(2000);
    if (mode === "sidebar") click("nav-item-disclosures"); else navigate("/loans/one/history");
    await advance(4000);
    if (mode === "route") navigate("/loans/one/documents");
    closing(); await advance(0);
    expect(screen.getByRole("tab", { name: "Closing Disclosure" })).toHaveAttribute("data-state", "active");
    expect(loadClosingDisclosures("one")).toEqual([]);
    tab("Closing Package");
    expect(JSON.parse(localStorage.getItem(packageKey("one"))!).generatedAt).toBe(pending.generatingUntil);
  });

  it("keeps pending CD generation alive across force-mounted tabs and loan state isolated", async () => {
    const navigate = await ready();
    queryClient.setQueryData(["/api/loans", "two"], loan("two"));
    closing(); click("button-generate-closing-disclosure"); tab("Closing Package");
    await advance(5000); tab("Closing Disclosure");
    expect(screen.getByTestId("row-closing-disclosure-1")).toBeInTheDocument();
    navigate("/loans/two/documents"); closing();
    expect(screen.queryByTestId("row-closing-disclosure-1")).not.toBeInTheDocument();
    navigate("/loans/one/documents"); closing();
    expect(screen.getByTestId("row-closing-disclosure-1")).toBeInTheDocument();
    expect(localStorage.getItem(cdKey("two"))).toBeNull();
  });

  it("edits an older row, preserves exact order/timestamps and discards cancelled drafts", async () => {
    seed(); await ready(); closing();
    expect(screen.getAllByRole("row").slice(1).map(row => row.getAttribute("data-testid")))
      .toEqual(["row-closing-disclosure-2", "row-closing-disclosure-1"]);
    expect(screen.getAllByRole("columnheader").map(el => el.textContent)).toEqual([
      "Document ID", "Date Generated", "Delivery Date", "Assumed Delivery Date", "Delivery Method", "CD Viewed", "",
    ]);
    click("button-edit-closing-disclosure-1");
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Closing Disclosure Delivery");
    fireEvent.change(screen.getByTestId("select-delivery-method-a"), { target: { value: "Mail" } });
    click("button-cancel-borrower-edit-1");
    click("button-edit-closing-disclosure-1");
    expect(screen.getByTestId("select-delivery-method-a")).toHaveValue("");
    fireEvent.change(screen.getByTestId("select-cd-viewed-a"), { target: { value: "Yes" } });
    await act(async () => click("button-save-borrower-edit-1"));
    expect(loadClosingDisclosures("one")[0]).toEqual({ ...record, id: 2 });
    expect(loadClosingDisclosures("one")[1]).toMatchObject({ ...record, borrowerDetails: [{ borrowerId: "a", cdViewed: "Yes" }, { borrowerId: "b" }] });
    click("button-view-borrower-status-1");
    expect(screen.getByTestId("popover-borrower-status-1")).toHaveTextContent("Synthetic Borrower A");
  });

  it("keeps failed drafts and prevents duplicate/dismissal of queued saves", async () => {
    seed(); await ready(); closing(); click("button-edit-closing-disclosure-1");
    fireEvent.change(screen.getByTestId("select-delivery-method-a"), { target: { value: "Mail" } });
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("synthetic full"); });
    await act(async () => click("button-save-borrower-edit-1"));
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("could not be saved");
    expect(screen.getByTestId("select-delivery-method-a")).toHaveValue("Mail");
    write.mockRestore();
    let commit!: () => void;
    const request = vi.fn((_key, fn) => new Promise<void>(resolve => { commit = () => { fn(); resolve(); }; }));
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
    click("button-save-borrower-edit-1"); click("button-save-borrower-edit-1");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("button-cancel-borrower-edit-1")).toBeDisabled();
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => commit());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("scoped reset cancels only CD; global UI reset clears package/local progress", async () => {
    seed(); await ready(); closing(); tab("Closing Package");
    fireEvent.click(screen.getByRole("button", { name: "Generate Closing Package" }));
    await advance(5000);
    const saved = localStorage.getItem(packageKey("one"));
    tab("Closing Disclosure");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    click("button-reset-closing-disclosure");
    expect(loadClosingDisclosures("one")).toHaveLength(2);
    confirm.mockReturnValue(true); await act(async () => click("button-reset-closing-disclosure"));
    expect(loadClosingDisclosures("one")).toEqual([]);
    expect(localStorage.getItem(packageKey("one"))).toBe(saved);
    fireEvent.click(screen.getByTestId("toolbar-checklist"));
    await act(async () => click("button-reset-demo"));
    expect(localStorage.getItem(packageKey("one"))).toBeNull();
  });

  it("opens exactly the static PDF URLs/arguments without real requests", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    seed(); await ready();
    click("button-generate-at-app-disclosures"); click("button-generate-loan-estimate"); await advance(5000);
    fireEvent.click(screen.getByRole("button", { name: "Download At-App Disclosures" }));
    fireEvent.click(screen.getByRole("button", { name: "View Loan Estimate" }));
    closing(); click("button-view-closing-disclosure-1");
    tab("Closing Package"); fireEvent.click(screen.getByRole("button", { name: "Generate Closing Package" }));
    await advance(5000); fireEvent.click(screen.getByRole("button", { name: "View Closing Package" }));
    expect(open.mock.calls).toEqual([
      ["/at-app-disclosures.pdf", "_blank"], ["/loan-estimate.pdf", "_blank"],
      [cdPdf, "_blank", "noopener,noreferrer"], [packagePdf, "_blank", "noopener,noreferrer"],
    ]);
  });
});
