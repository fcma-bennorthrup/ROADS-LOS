import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentsContent } from "../DisclosureDocumentsContent";

afterEach(() => {
  vi.useRealTimers();
});

describe("DocumentsContent disclosure delivery actions", () => {
  it("places matching delivery buttons after the existing Download and View buttons", () => {
    render(<DocumentsContent />);

    const download = screen.getByRole("button", { name: "Download At-App Disclosures" });
    const deliverAtApp = screen.getByRole("button", { name: "Deliver At-App Disclosures" });
    const view = screen.getByRole("button", { name: "View Loan Estimate" });
    const deliverEstimate = screen.getByRole("button", { name: "Deliver Loan Estimate" });

    expect(
      download.compareDocumentPosition(deliverAtApp) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      view.compareDocumentPosition(deliverEstimate) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(deliverAtApp.className).toBe(download.className);
    expect(deliverAtApp.style.cssText).toBe(download.style.cssText);
    expect(deliverEstimate.className).toBe(view.className);
    expect(deliverEstimate.style.cssText).toBe(view.style.cssText);
    expect(deliverAtApp).toHaveAttribute("aria-disabled", "true");
    expect(deliverEstimate).toHaveAttribute("aria-disabled", "true");
  });

  it.each([
    {
      prefix: "at-app-disclosures",
      generateLabel: "Generate At-App Disclosures",
      deliverLabel: "Deliver At-App Disclosures",
    },
    {
      prefix: "loan-estimate",
      generateLabel: "Generate Loan Estimate",
      deliverLabel: "Deliver Loan Estimate",
    },
  ])("records delivery after $generateLabel finishes", ({ prefix, generateLabel, deliverLabel }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T15:45:00"));
    render(<DocumentsContent />);

    const generate = screen.getByRole("button", { name: generateLabel });
    const deliver = screen.getByRole("button", { name: deliverLabel });

    fireEvent.click(deliver);
    expect(screen.queryByTestId(`text-${prefix}-delivered`)).not.toBeInTheDocument();

    fireEvent.click(generate);
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(deliver).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(deliver);
    expect(screen.getByTestId(`text-${prefix}-delivered`)).toHaveTextContent(
      "Marked Delivered: 09/09/2026 03:45 PM",
    );
  });
});