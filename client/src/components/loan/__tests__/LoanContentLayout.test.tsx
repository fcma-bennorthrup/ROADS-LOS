import { readFileSync } from "node:fs";
import { useState, type ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";
import { CollateralContent } from "../CollateralContent";
import { LoanDetailsContent } from "../LoanDetailsContent";
import { BorrowerInformationContent } from "../BorrowerInformationContent";
import { BorrowerFinancialsContent } from "../BorrowerFinancialsContent";
import { ProductPricingContent } from "../ProductPricingContent";
import { StockContent } from "../StockContent";
import { DecisioningSummaryContent } from "../DecisioningSummaryContent";
import { ClosingContent } from "../ClosingContent";
import { BookingContent } from "../BookingContent";
import { CustomerDocumentsContent } from "../CustomerDocumentsContent";
import { FeesContent } from "../FeesContent";
import { CreditsContent } from "../CreditsContent";
import { DocumentsContent, DocumentSection } from "../DisclosureDocumentsContent";

// Rendering these layout contracts must never load or update saved loans.
vi.mock("@/contexts/loan-application-context", () => ({
  useLoanState: (_key: string, initial: unknown) => useState(initial),
  useLoanDraft: (_key: string, initial: unknown) => [...useState(initial), vi.fn()],
  useLoanEditing: () => {},
  useApplicationStatus: () => ({ document: null }),
}));

const layoutCss = readFileSync("client/src/components/loan/LoanContentLayout.css", "utf8");
const tokens = readFileSync("client/src/styles/design-tokens.css", "utf8");
const tokenValues = Object.fromEntries([...tokens.matchAll(/(--roads-spacing-[\w-]+):\s*(\d+)px/g)]
  .map(([, name, value]) => [name, value]));
let stylesheet: HTMLStyleElement;

function mount(page: ReactElement) {
  stylesheet = document.createElement("style");
  stylesheet.textContent = layoutCss;
  document.head.appendChild(stylesheet);
  return render(<LoanActivityProvider><ChecklistProvider>{page}</ChecklistProvider></LoanActivityProvider>);
}

afterEach(() => {
  cleanup();
  stylesheet?.remove();
});

function resolveLength(value: string): number {
  const resolved = value.replace(/var\((--[\w-]+)\)/g, (_, token: string) => {
    if (!(token in tokenValues)) throw new Error(`Unknown spacing token: ${token}`);
    return `${tokenValues[token]}px`;
  });
  if (resolved.startsWith("calc(")) {
    const expression = resolved.slice(5, -1).replaceAll("px", "");
    if (!/^[\d\s.+-]+$/.test(expression)) throw new Error(`Unsupported length: ${resolved}`);
    return [...expression.matchAll(/[+-]?\s*\d+(?:\.\d+)?/g)]
      .reduce((sum, [part]) => sum + Number(part.replaceAll(" ", "")), 0);
  }
  if (!/^-?\d+(?:px)?$/.test(resolved)) throw new Error(`Unsupported length: ${resolved}`);
  return parseFloat(resolved);
}

function leftDeclaration(style: CSSStyleDeclaration, kind: "padding" | "margin"): number | undefined {
  const explicit = style.getPropertyValue(`${kind}-left`) || style.getPropertyValue(`${kind}-inline`);
  if (explicit) return resolveLength(explicit);
  const shorthand = style.getPropertyValue(kind);
  if (!shorthand) return undefined;
  // Expand variables before splitting the shorthand; calc() is used only in
  // the horizontal position in these components and can contain whitespace.
  const expanded = shorthand.replace(/var\((--[\w-]+)\)/g, (_, token: string) => `${tokenValues[token]}px`);
  const parts = expanded.match(/calc\([^)]*\)|[^\s]+/g) ?? [];
  return resolveLength(parts.length === 4 ? parts[3] : parts[1] ?? parts[0]);
}

/** Checks declared indentation through every ancestor, not browser geometry.
 * Flex/grid column positions, borders and control/table interiors are outside
 * this IA contract. jsdom does not perform layout. */
function indentation(element: HTMLElement): number {
  let total = 0;
  for (let node: HTMLElement | null = element; node && node !== document.body; node = node.parentElement) {
    for (const kind of ["margin", "padding"] as const) {
      // A button's alignment is its border edge, not its padded text.
      if (node === element && node.tagName === "BUTTON" && kind === "padding") continue;
      let inset = 0;
      for (const rule of Array.from(stylesheet.sheet!.cssRules)) {
        if (rule instanceof CSSStyleRule && node.matches(rule.selectorText)) {
          inset = leftDeclaration(rule.style, kind) ?? inset;
        }
      }
      total += leftDeclaration(node.style, kind) ?? inset;
    }
  }
  return total;
}

function text(value: string) { return screen.getByText(value, { exact: true }); }
function at(element: HTMLElement, offset: number) { expect(indentation(element)).toBe(offset); }

describe("loan page total indentation from the side navigation", () => {
  it.each([
    ["Loan Details", <LoanDetailsContent />, "Loan Type"],
    ["Borrower Information", <BorrowerInformationContent />, "First Name"],
    ["Product & Pricing", <ProductPricingContent />, "Product Type"],
    ["Stock Voter", <StockContent />, "Stock Voter"],
    ["Closing Details", <ClosingContent />, "Closing Date"],
    ["Booking", <BookingContent />, "Book Loan"],
  ] as const)("%s keeps the title at xl and entry content at 3xl", (title, page, field) => {
    mount(page);
    at(screen.getByRole("heading", { name: title }), 24);
    const entry = field === "Stock Voter" ? screen.getByTestId("select-stock-voter").parentElement! : text(field);
    at(entry, 40);
  });

  it("keeps collateral fields and their 40px gaps while separating all heading levels", () => {
    mount(<CollateralContent />);
    at(screen.getByTestId("text-collateral-title"), 24);
    for (const name of ["Subject Property", "Value", "Task Buttons"]) {
      at(screen.getByRole("heading", { name }), 32);
    }
    at(text("Monthly Property Taxes"), 40);
    at(text("Collateral Owner"), 40);
    at(screen.getByTestId("button-split-appraisal"), 40);
    expect(screen.getByTestId("subject-property-field-grid").style.gap).toBe("var(--roads-spacing-component-3xl)");
  });

  it("aligns borrower names and questionnaire headings without adding to questionnaire field padding", () => {
    mount(<BorrowerInformationContent />);
    at(screen.getByTestId("text-borrower-name"), 32);
    for (const id of ["section-declarations", "section-military", "section-demographic"]) {
      at(screen.getByTestId(id), 32);
    }
    at(text("Will you occupy the property as your primary residence?"), 40);
    at(text("Ethnicity (check one or more):"), 40);
  });

  it("counts financial section and card ancestors only once", () => {
    mount(<BorrowerFinancialsContent />);
    at(screen.getByTestId("heading-borrower-financials"), 24);
    for (const id of ["text-income-title", "text-balance-sheet-title", "text-current-assets-heading"]) {
      at(screen.getByTestId(id), 32);
    }
    at(screen.getAllByText("Income Type", { exact: true })[0], 40);
    at(screen.getAllByText("Asset Type", { exact: true })[0], 40);
  });

  it("separates decisioning section labels and actions", () => {
    mount(<DecisioningSummaryContent />);
    at(screen.getByTestId("heading-decisioning-summary"), 24);
    at(screen.getByTestId("text-loan-decision-label"), 32);
    at(screen.getByTestId("button-decision-loan"), 40);
  });

  it("aligns the nested Wire Request section without shifting its control interior", () => {
    mount(<ClosingContent />);
    at(screen.getByRole("heading", { name: "Wire Request" }), 32);
    at(screen.getByTestId("button-wire-request"), 40);
  });

  it("keeps the Customer Documents title and staggers Minimum Required Documents", () => {
    mount(<CustomerDocumentsContent />);
    at(screen.getByRole("heading", { name: "Customer Documents" }), 24);
    at(screen.getByRole("heading", { name: "Minimum Required Documents" }), 32);
    at(screen.getByTestId("button-completed-mindocs"), 40);
  });

  it.each([
    ["fees", <FeesContent />],
    ["credits", <CreditsContent />],
  ] as const)("%s uses headline-200 and insets entry fields, not the table", (name, page) => {
    mount(page);
    const title = screen.getByTestId(`text-${name}-title`);
    at(title, 24);
    expect(title).toHaveClass("headline-200");
    expect(title).not.toHaveClass("headline-300");
    at(screen.getByTestId(`${name}-field-row`), 40);
    expect(screen.getByTestId(`${name}-table`).closest(".loan-layout-fields")).toBeNull();
  });

  it("adds a Disclosures title and scopes group indentation away from Closing Documents", () => {
    mount(<DocumentsContent />);
    at(screen.getByRole("heading", { name: "Disclosures" }), 24);
    for (const prefix of ["at-app-disclosures", "loan-estimate"]) {
      at(screen.getByTestId(`text-${prefix}-title`), 32);
      at(screen.getByTestId(`text-${prefix}-status`), 40);
    }
    cleanup();
    render(<div style={{ padding: "var(--roads-spacing-component-xl)" }}>
      <DocumentSection title="Closing group" idleText="Not generated" generatingText="Generating"
        generateLabel="Generate" secondaryActions={[]} testIdPrefix="closing-group" />
    </div>);
    at(screen.getByTestId("text-closing-group-title"), 24);
    at(screen.getByTestId("text-closing-group-status"), 24);
  });
});
