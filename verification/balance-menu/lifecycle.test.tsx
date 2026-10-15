import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BorrowerFinancialsContent } from "@/components/loan/BorrowerFinancialsContent";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

for (const category of ["current", "non-current"]) {
  for (const kind of ["asset", "liability"]) {
    it(`${category} ${kind}: independent lifecycle, mousedown timing, deletion and cleanup`, () => {
      const add = vi.spyOn(document, "addEventListener");
      const remove = vi.spyOn(document, "removeEventListener");
      const view = render(<BorrowerFinancialsContent />);
      const row = within(screen.getByTestId(`balance-sheet-row-${category}-assets`));
      const trigger = row.getByTestId(`button-more-${kind}-0`);
      const menu = () => row.queryByTestId(`menu-${kind}-0`);
      const listeners = () => add.mock.calls.filter(([type]) => type === "mousedown");
      const removals = () => remove.mock.calls.filter(([type]) => type === "mousedown");
      const initial = listeners().length;
      expect(trigger.tagName.toLowerCase()).toBe("svg");
      expect(trigger).not.toHaveAttribute("tabindex");
      fireEvent.click(trigger);
      expect(listeners()).toHaveLength(initial + 1);
      fireEvent.click(screen.getByTestId("tab-borrower-1"));
      expect(menu()).toBeInTheDocument();
      expect(listeners()).toHaveLength(initial + 1);
      fireEvent.mouseDown(menu()!);
      expect(menu()).toBeInTheDocument();
      fireEvent.click(document.body);
      expect(menu()).toBeInTheDocument(); // click alone is not outside mousedown
      fireEvent.keyDown(document, { key: "Escape" });
      expect(menu()).toBeInTheDocument(); // no Escape handler
      fireEvent.click(trigger);
      expect(menu()).not.toBeInTheDocument();
      expect(removals().at(-1)?.[1]).toBe(listeners().at(-1)?.[1]);
      fireEvent.click(trigger);
      fireEvent.mouseDown(document.body);
      expect(menu()).not.toBeInTheDocument();
      const other = kind === "asset" ? "liability" : "asset";
      fireEvent.click(row.getByTestId(`button-edit-${other}-0`));
      fireEvent.click(trigger);
      expect(row.getByTestId(`button-save-${other}-0`)).toBeInTheDocument();
      // Programmatic clicks without preceding mousedown demonstrate per-card state.
      fireEvent.click(row.getByTestId(`button-more-${other}-0`));
      expect(menu()).toBeInTheDocument();
      expect(row.getByTestId(`menu-${other}-0`)).toBeInTheDocument();
      fireEvent.mouseDown(menu()!);
      expect(row.queryByTestId(`menu-${other}-0`)).not.toBeInTheDocument();
      const button = row.getByTestId(`button-delete-${kind}-0`);
      button.focus();
      expect(document.activeElement).toBe(button);
      fireEvent.mouseDown(button);
      expect(menu()).toBeInTheDocument();
      fireEvent.click(button);
      expect(row.queryByTestId(`${kind}-card-0`)).not.toBeInTheDocument();
      expect(row.getByTestId(`button-save-${other}-0`)).toBeInTheDocument();
      fireEvent.click(row.getByTestId(`button-more-${other}-0`));
      view.unmount();
      for (const [, listener] of listeners()) {
        expect(removals().filter(([, removed]) => removed === listener)).toHaveLength(1);
      }
    });
  }
}
