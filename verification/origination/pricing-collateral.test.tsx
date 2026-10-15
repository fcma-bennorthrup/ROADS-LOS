import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductPricingContent } from "@/components/loan/ProductPricingContent";
import { CollateralContent } from "@/components/loan/CollateralContent";
import { Providers, change, choose, click } from "./helpers";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const toggle = () => fireEvent.click(screen.getByText("Toggle section fixture"));
const reset = async () => {
  fireEvent.click(screen.getByText("Reset fixture"));
  await waitFor(() => expect(screen.getByTestId("rate-status")).toHaveTextContent("not-started"));
};
const lock = () => { click("button-lock-rate"); click("button-confirm-lock-rate"); };
const catalog = [
  ["arm", "4251", "12", "6.250%", "6.900%"],
  ["arm", "4243", "36", "6.370%", "7.020%"],
  ["arm", "4245", "60", "6.500%", "7.150%"],
  ["arm", "4247", "84", "6.500%", "7.150%"],
  ["arm", "4240", "120", "6.500%", "7.150%"],
  ["arm", "4242", "180", "6.750%", "7.400%"],
  ["fixed", "4370", "120", "6.125%", "6.775%"],
  ["fixed", "4371", "180", "6.375%", "7.025%"],
  ["fixed", "4372", "240", "6.625%", "7.275%"],
  ["fixed", "4373", "300", "6.750%", "7.400%"],
  ["fixed", "4374", "360", "6.750%", "7.400%"],
];
describe("Pricing catalog and lifetimes", () => {
  it.each(catalog)("%s %s preserves exact term and rates", (type, id, term, base, final) => {
    render(<Providers><ProductPricingContent /></Providers>);
    click("button-edit-product");
    choose("select-product-type", type);
    choose("select-product", id);
    expect(screen.getByTestId("input-term-months-")).toHaveValue(term);
    expect(screen.getByTestId("text-base-rate")).toHaveTextContent(base);
    expect(screen.getByTestId("text-final-rate")).toHaveTextContent(final);
    change("input-term-months-", "");
    expect(screen.getByTestId("text-final-rate")).toHaveTextContent(final);
    click("button-save-changes");
    click("button-edit-product");
    expect(screen.getByTestId("input-term-months-")).toHaveValue("");
    choose("select-product", id);
    expect(screen.getByTestId("input-term-months-")).toHaveValue(term);
    click("button-discard-changes");
    click("button-edit-product");
    expect(screen.getByTestId("input-term-months-")).toHaveValue("");
  });
  it("locks unsaved terms; Cancel/close/Escape retain changed date; remount keeps status but loses terms", () => {
    render(<Providers><ProductPricingContent /></Providers>);
    click("button-edit-product");
    choose("select-product", "4374");
    change("input-term-months-", "arbitrary");
    click("button-lock-rate");
    expect(screen.getByTestId("input-lock-date")).toHaveValue("11/28/2026");
    expect(screen.getByTestId("input-lock-date")).toBeDisabled();
    click("button-cancel-lock");
    expect(screen.getByTestId("input-term-months-")).toHaveValue("arbitrary");
    lock();
    expect(screen.getByTestId("button-edit-product")).toBeDisabled();
    expect(screen.getByTestId("form-field-term-months-")).toHaveTextContent("arbitrary");
    for (const close of ["button-cancel-lock", "button-close-lock-modal", "escape"]) {
      click("button-lock-rate");
      change("input-lock-date", `invalid-${close}`);
      if (close === "escape") fireEvent.keyDown(screen.getByTestId("rate-lock-modal"), { key: "Escape" });
      else click(close);
      expect(screen.queryByTestId("rate-lock-modal")).not.toBeInTheDocument();
      click("button-lock-rate");
      expect(screen.getByTestId("input-lock-date")).toHaveValue(`invalid-${close}`);
      click("button-cancel-lock");
    }
    toggle(); toggle();
    expect(screen.getByTestId("rate-status")).toHaveTextContent("complete");
    expect(screen.getByTestId("text-final-rate")).toHaveTextContent("6.775%");
    expect(screen.getByTestId("form-field-term-months-")).toHaveTextContent("120");
  });
  it("opens the static PDF with exact safe arguments without completing a task", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<Providers><ProductPricingContent /></Providers>);
    click("button-generate-rate-lock-letter");
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      new URL("../../attached_assets/Rate_Lock_Letter_-_Consumer_Redacted_1777397784766.pdf", import.meta.url).href,
      "_blank", "noopener,noreferrer");
    expect(screen.getByTestId("rate-status")).toHaveTextContent("not-started");
  });
  it.each([true, false])("characterizes reset while mounted=%s and historical reset replay", async mounted => {
    render(<Providers><ProductPricingContent /></Providers>);
    click("button-edit-product");
    choose("select-product", "4374");
    lock();
    if (!mounted) toggle();
    await reset();
    if (!mounted) toggle();
    expect(screen.getByTestId("button-lock-rate")).toHaveTextContent("Lock Rate");
    expect(screen.getByTestId("text-final-rate")).toHaveTextContent(mounted ? "7.400%" : "6.775%");
    lock();
    toggle(); toggle();
    expect(screen.getByTestId("rate-status")).toHaveTextContent("complete");
    expect(screen.queryByTestId("icon-rate-locked")).not.toBeInTheDocument();
  });
});

describe("Collateral split and reset lifetimes", () => {
  it("edits both evaluations; discard restores both; delete during edit retains evaluation 1 draft", () => {
    render(<Providers><CollateralContent /></Providers>);
    const initial = screen.getByTestId("field-estimated-value").textContent;
    click("value-button-edit");
    change("input-estimated-value", "first unsaved");
    click("button-split-appraisal");
    click("tab-evaluation-2");
    change("input-estimated-value", "second unsaved");
    click("value-button-discard");
    expect(screen.getByTestId("field-estimated-value")).not.toHaveTextContent("second unsaved");
    click("tab-evaluation-1");
    expect(screen.getByTestId("field-estimated-value").textContent).toBe(initial);
    click("value-button-edit");
    change("input-estimated-value", "saved first");
    click("tab-evaluation-2");
    change("input-estimated-value", "saved second");
    click("value-button-save");
    click("value-button-edit");
    click("tab-evaluation-1");
    change("input-estimated-value", "retained unsaved");
    click("button-delete-evaluation");
    expect(screen.queryByTestId("input-estimated-value")).not.toBeInTheDocument();
    expect(screen.getByTestId("field-estimated-value")).toHaveTextContent("retained unsaved");
    click("button-split-appraisal"); click("tab-evaluation-2");
    expect(screen.getByTestId("field-estimated-value")).not.toHaveTextContent("saved second");
  });
  it.each([true, false])("clears address on mounted=%s reset and replays after a newer save", async mounted => {
    render(<Providers><CollateralContent /></Providers>);
    click("address-button-edit"); change("input-address-1", "Synthetic old"); click("address-button-save");
    click("value-button-edit"); change("input-estimated-value", "evaluation draft");
    if (!mounted) toggle();
    await reset();
    if (!mounted) toggle();
    await waitFor(() => expect(screen.getByTestId("field-address-1")).not.toHaveTextContent("Synthetic old"));
    if (mounted) expect(screen.getByTestId("input-estimated-value")).toHaveValue("evaluation draft");
    click("address-button-edit"); change("input-address-1", "Synthetic newer"); click("address-button-save");
    toggle(); toggle();
    expect(screen.getByTestId("field-address-1")).not.toHaveTextContent("Synthetic newer");
  });
});
