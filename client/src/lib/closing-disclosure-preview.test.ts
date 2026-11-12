import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closingDisclosureStorageKey } from "./closing-disclosure-history";
import { openClosingDisclosurePreview } from "./closing-disclosure-preview";
import { assumedDeliveryCalendarDate } from "./closing-disclosure-borrowers";

const record = { id: 1, generatedAt: "2026-10-14T12:00:00Z", deliveredAt: null };
afterEach(() => vi.restoreAllMocks());
beforeEach(() => {
  localStorage.setItem(closingDisclosureStorageKey("preview"), JSON.stringify([record]));
});

describe("simulated disclosure preview", () => {
  it.each([
    ["2026-10-14", "2026-10-17"],
    ["2026-01-30", "2026-02-02"],
    ["2026-12-30", "2027-01-02"],
    ["2028-02-27", "2028-03-01"],
    ["2026-03-07", "2026-03-10"],
    ["2026-10-31", "2026-11-03"],
  ])("adds three calendar days from %s to %s", (delivery, assumed) => {
    expect(assumedDeliveryCalendarDate(delivery)).toBe(assumed);
  });

  it("opens the selected record safely without writing history or viewing data", () => {
    const doc = document.implementation.createHTMLDocument();
    const popup = { document: doc, opener: window, close: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    const before = localStorage.getItem(closingDisclosureStorageKey("preview"));
    openClosingDisclosurePreview("preview", record);
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(popup.opener).toBeNull();
    expect(doc.title).toContain("CD 1");
    expect(doc.body.textContent).toContain("SIMULATION ONLY");
    expect(doc.body.textContent).toContain("Not delivered");
    expect(doc.querySelector("script")).toBeNull();
    expect(localStorage.getItem(closingDisclosureStorageKey("preview"))).toBe(before);
  });

  it("reports blocked popups explicitly", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    expect(() => openClosingDisclosurePreview("preview", record)).toThrow("Allow pop-ups");
  });

  it("rejects removed or replaced records without opening a window", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    localStorage.setItem(closingDisclosureStorageKey("preview"), "[]");
    expect(() => openClosingDisclosurePreview("preview", record)).toThrow("reset or removed");
    localStorage.setItem(closingDisclosureStorageKey("preview"), JSON.stringify([{ ...record, generatedAt: "2026-11-01T12:00:00Z" }]));
    expect(() => openClosingDisclosurePreview("preview", record)).toThrow("reset or removed");
    expect(open).not.toHaveBeenCalled();
  });

  it("reads latest delivery metadata and renders identifiers as text, never markup", () => {
    const loanId = "<img src=x onerror=alert(1)>";
    localStorage.setItem(closingDisclosureStorageKey(loanId), JSON.stringify([{ ...record, deliveredAt: "2026-10-14T12:00:00Z" }]));
    const doc = document.implementation.createHTMLDocument();
    vi.spyOn(window, "open").mockReturnValue({ document: doc, close: vi.fn() } as unknown as Window);
    openClosingDisclosurePreview(loanId, record);
    expect(doc.body.textContent).toContain(loanId);
    expect(doc.querySelector("img")).toBeNull();
    expect(doc.body.textContent).toContain("Blend");
    expect(doc.body.textContent).toContain("10/17/2026");
  });
});
