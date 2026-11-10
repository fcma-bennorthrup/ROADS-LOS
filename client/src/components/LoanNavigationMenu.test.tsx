import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { LoanNavigationMenu } from "./LoanNavigationMenu";

const store = vi.hoisted(() => ({ dirty: false, flush: vi.fn() }));
vi.mock("@/lib/loan-application-store", () => ({ applicationStore: store }));

function mountMenu() {
  const location = memoryLocation({ path: "/loans/synthetic-168/documents", record: true });
  render(<Router hook={location.hook}>
    <Route path="/loans/:id/documents">
      <LoanNavigationMenu />
      <label>Synthetic loan note<input aria-label="Synthetic loan note" defaultValue="Unsaved synthetic note" /></label>
    </Route>
    <Route path="/pipeline"><h1>Pipeline fixture</h1></Route>
  </Router>);
  return location;
}

describe("loan navigation modal", () => {
  beforeEach(() => {
    store.dirty = false;
    store.flush.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("opens only the reference destinations and closes with X without resetting edits", async () => {
    const user = userEvent.setup();
    mountMenu();
    const note = screen.getByRole("textbox");
    await user.type(note, " — edited");
    const trigger = screen.getByRole("button", { name: "Open loan navigation" });
    await user.click(trigger);
    const drawer = screen.getByRole("dialog", { name: "Loan navigation" });
    expect(within(drawer).getByText("ROADS")).toBeVisible();
    expect(within(drawer).getByRole("button", { name: /Reports/ })).toBeDisabled();
    expect(within(drawer).queryByText("Dashboard")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Saved items")).not.toBeInTheDocument();
    await user.click(within(drawer).getByRole("button", { name: "Close loan navigation" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(note).toHaveValue("Unsaved synthetic note — edited");
    expect(store.flush).not.toHaveBeenCalled();
  });

  it("traps keyboard focus and dismisses with Escape, restoring trigger focus", async () => {
    const user = userEvent.setup();
    mountMenu();
    const trigger = screen.getByRole("button", { name: "Open loan navigation" });
    await user.click(trigger);
    const drawer = screen.getByRole("dialog");
    for (let i = 0; i < 5; i++) {
      await user.tab();
      expect(drawer.contains(document.activeElement)).toBe(true);
    }
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("dismisses on backdrop interaction and restores trigger focus", async () => {
    const user = userEvent.setup();
    mountMenu();
    const trigger = screen.getByRole("button", { name: "Open loan navigation" });
    await user.click(trigger);
    await user.click(screen.getByTestId("loan-navigation-backdrop"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("keeps the drawer and edits intact when the leave guard is cancelled", async () => {
    const user = userEvent.setup();
    store.dirty = true;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const location = mountMenu();
    await user.click(screen.getByRole("button", { name: "Open loan navigation" }));
    await user.click(screen.getByTestId("loan-nav-pipeline"));
    expect(confirm).toHaveBeenCalledWith("Discard unsaved edits and return to Pipeline?");
    expect(store.flush).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByLabelText("Synthetic loan note")).toHaveValue("Unsaved synthetic note");
    expect(location.history).not.toContain("/pipeline");
  });

  it("shows save errors inside the drawer and permits retry without losing edits", async () => {
    const user = userEvent.setup();
    store.flush.mockRejectedValueOnce(new Error("Synthetic save failure"));
    const location = mountMenu();
    await user.click(screen.getByRole("button", { name: "Open loan navigation" }));
    await user.click(screen.getByTestId("loan-nav-pipeline"));
    const drawer = screen.getByRole("dialog");
    expect(await within(drawer).findByRole("alert")).toHaveTextContent("Could not leave: Synthetic save failure");
    expect(screen.getByLabelText("Synthetic loan note")).toHaveValue("Unsaved synthetic note");
    expect(location.history).not.toContain("/pipeline");
    expect(screen.getByTestId("loan-nav-pipeline")).toBeEnabled();
    await user.click(screen.getByTestId("loan-nav-pipeline"));
    expect(await screen.findByRole("heading", { name: "Pipeline fixture" })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(store.flush).toHaveBeenCalledTimes(2);
  });

  it("flushes confirmed edits before leaving and unmounts the drawer", async () => {
    const user = userEvent.setup();
    store.dirty = true;
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mountMenu();
    await user.click(screen.getByRole("button", { name: "Open loan navigation" }));
    await user.click(screen.getByTestId("loan-nav-pipeline"));
    expect(await screen.findByRole("heading", { name: "Pipeline fixture" })).toBeVisible();
    expect(store.flush).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
