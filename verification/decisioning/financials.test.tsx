import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BorrowerFinancialsContent } from "@/components/loan/BorrowerFinancialsContent";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const click = (id: string) => fireEvent.click(screen.getByTestId(id));
const change = (id: string, value: string) =>
  fireEvent.change(screen.getByTestId(`input-${id}`), { target: { value } });
const row = (nonCurrent = false) =>
  screen.getByTestId(`balance-sheet-row-${nonCurrent ? "non-current" : "current"}-assets`);
const inRow = (id: string, nonCurrent = false) => within(row(nonCurrent)).getByTestId(id);
const select = (id: string, text: string) => {
  click(`select-${id}`);
  click(`select-${id}-option-${text.toLowerCase().replace(/[\s\/]+/g, "-")}`);
};

describe("income characterization (current behavior, not desired semantics)", () => {
  it("keeps stale read-only totals until Save and uses permissive numeric parsing", () => {
    render(<BorrowerFinancialsContent />);
    click("button-edit-income-0");
    for (const [name, value] of Object.entries({
      "base-employment-income": "1,200.50tail", overtime: "$900",
      bonuses: "invalid", commissions: "-12.50", other: "",
    })) change(name, value);
    expect(screen.getByTestId("field-total-yearly-income")).toHaveTextContent("$73,000.00");
    expect(screen.queryByTestId("input-total-yearly-income")).not.toBeInTheDocument();
    click("button-save-income-0");
    expect(screen.getByTestId("field-total-yearly-income")).toHaveTextContent("$1,188.00");
    expect(screen.getByTestId("field-total-monthly-income")).toHaveTextContent("$99.00");
    expect(screen.getByTestId("field-base-employment-income")).toHaveTextContent("1,200.50tail");
    // The adornment and formatted value both contain a dollar symbol.
    expect(screen.getByTestId("field-total-yearly-income").textContent?.match(/\$/g)).toHaveLength(2);
  });

  it("saves all string fields, hides rather than erases End Date, and retains collapsed drafts", () => {
    render(<BorrowerFinancialsContent />);
    click("button-edit-income-0");
    const fields = {
      employer: "Fixture employer", "title-position": "Fixture role",
      "start-date": "2026-10-15", "years-employed": "-2",
      "years-in-line-of-work": "unknown", "address-1": "Fixture street",
      "address-2": "Fixture unit", city: "Fixture city", state: "ZZ",
      zip: "not-a-zip", "phone-number": "not-a-phone",
    };
    for (const [name, value] of Object.entries(fields)) change(name, value);
    for (const type of ["1099", "Self-Employment", "Other", "W2"]) select("income-type", type);
    select("current-job?", "No");
    change("end-date", "2020-01-01");
    expect(screen.queryByTestId("chip-current-job-0")).not.toBeInTheDocument();
    select("current-job?", "Yes");
    expect(screen.queryByTestId("input-end-date")).not.toBeInTheDocument();
    select("current-job?", "No");
    expect(screen.getByTestId("input-end-date")).toHaveValue("2020-01-01");
    click("income-source-header-0");
    expect(screen.queryByTestId("button-save-income-0")).not.toBeInTheDocument();
    click("income-source-header-0");
    expect(screen.getByTestId("input-employer")).toHaveValue("Fixture employer");
    click("button-save-income-0");
    for (const [name, value] of Object.entries(fields))
      expect(screen.getByTestId(`field-${name}`)).toHaveTextContent(value);
    expect(screen.getByTestId("field-end-date")).toHaveTextContent("2020-01-01");
  });

  it("retains added rows on discard; changing editor abandons its draft", () => {
    render(<BorrowerFinancialsContent />);
    click("button-edit-income-0");
    change("employer", "Abandoned");
    click("button-add-income-source");
    change("employer", "Also abandoned");
    click("button-discard-income-1");
    expect(screen.getAllByTestId(/^income-source-card-/)).toHaveLength(2);
    expect(screen.getByTestId("text-income-source-title-1")).toHaveTextContent(/^W2$/);
    expect(screen.getByTestId("text-income-source-title-0")).not.toHaveTextContent("Abandoned");
    click("button-edit-income-1");
    change("employer", "Discard by switching");
    click("button-edit-income-0");
    expect(screen.getByTestId("text-income-source-title-1")).toHaveTextContent(/^W2$/);
    change("employer", "Saved first borrower");
    click("button-save-income-0");
    click("tab-borrower-1");
    expect(screen.queryByTestId("chip-primary-wage-earner")).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^income-source-card-/)).toHaveLength(1);
    click("button-edit-income-0");
    change("employer", "Second borrower draft");
    click("tab-borrower-1"); // Even selecting the same tab discards.
    expect(screen.queryByTestId("input-employer")).not.toBeInTheDocument();
    expect(screen.getByTestId("text-income-source-title-0")).not.toHaveTextContent("Second borrower draft");
    click("tab-borrower-0");
    expect(screen.getByTestId("text-income-source-title-0")).toHaveTextContent("Saved first borrower");
    expect(screen.getAllByTestId(/^income-source-card-/)).toHaveLength(2);
  });

  it("keeps income and household-like balance drafts independent across borrower tabs", () => {
    render(<BorrowerFinancialsContent />);
    click("button-edit-income-0");
    change("employer", "Unsaved income");
    fireEvent.click(inRow("button-edit-asset-0"));
    change("financial-institution", "Household draft");
    click("button-save-income-0");
    expect(screen.getByTestId("input-financial-institution")).toHaveValue("Household draft");
    click("tab-borrower-1");
    expect(screen.getByTestId("input-financial-institution")).toHaveValue("Household draft");
    fireEvent.click(inRow("button-save-asset-0"));
    click("tab-borrower-0");
    expect(inRow("asset-card-0")).toHaveTextContent("Household draft");
    expect(screen.getByTestId("text-income-source-title-0")).toHaveTextContent("Unsaved income");
  });
});

describe.each([
  { category: "current-assets", kind: "asset", nonCurrent: false, field: "financial-institution", amount: "cash-or-market-value" },
  { category: "non-current-assets", kind: "asset", nonCurrent: true, field: "financial-institution", amount: "cash-or-market-value" },
  { category: "current-liabilities", kind: "liability", nonCurrent: false, field: "creditor-name", amount: "unpaid-balance" },
  { category: "non-current-liabilities", kind: "liability", nonCurrent: true, field: "creditor-name", amount: "unpaid-balance" },
])("$category", ({ category, kind, nonCurrent, field, amount }) => {
  const action = (verb: string, index: number) =>
    fireEvent.click(inRow(`button-${verb}-${kind}-${index}`, nonCurrent));
  const card = (index: number) => inRow(`${kind}-card-${index}`, nonCurrent);
  const add = () => {
    vi.setSystemTime(new Date(Date.now() + 1)); // Avoid unrelated same-millisecond collisions.
    click(`button-add-${category}`);
  };
  const remove = (index: number) => { action("more", index); action("delete", index); };

  it("saves raw strings, discards edits, retains add-then-discard and renders unequal/empty cells", () => {
    render(<BorrowerFinancialsContent />);
    action("edit", 0);
    change(field, "Fixture institution");
    change(amount, "$invalid -123tail");
    change("account-number", "arbitrary account");
    if (kind === "liability") {
      change("monthly-payment", "-bad");
      select("will-be-paid-off-by-closing?", "Yes");
    }
    action("save", 0);
    expect(card(0)).toHaveTextContent("$invalid -123tail");
    expect(card(0)).toHaveTextContent("arbitrary account");
    action("edit", 0);
    change(field, "discard me");
    action("discard", 0);
    expect(card(0)).toHaveTextContent("Fixture institution");
    add();
    change(field, "discard added draft");
    action("discard", 1);
    expect(card(1)).not.toHaveTextContent("discard added draft");
    expect(row(nonCurrent).children).toHaveLength(6); // Two headers + two paired rows.
    expect(row(nonCurrent).children[kind === "asset" ? 5 : 4]).toBeEmptyDOMElement();
    remove(1);
    remove(0);
    expect(within(row(nonCurrent)).queryAllByTestId(new RegExp(`^${kind}-card-`))).toHaveLength(0);
    expect(screen.getByTestId(`button-add-${category}`)).toBeInTheDocument();
  });

  it("characterizes known defect: deleting before a draft redirects it to the later row", () => {
    render(<BorrowerFinancialsContent />);
    add(); change(field, "Row B"); action("save", 1);
    add(); change(field, "Row C"); action("save", 2);
    action("edit", 1); change(field, "Draft B");
    remove(0);
    expect(card(0)).toHaveTextContent("Row B");
    expect(within(card(1)).getByTestId(`input-${field}`)).toHaveValue("Draft B");
    action("save", 1);
    expect(card(0)).toHaveTextContent("Row B");
    expect(card(1)).toHaveTextContent("Draft B");
    expect(row(nonCurrent)).not.toHaveTextContent("Row C");
  });

  it("clears the deleted current editor and abandons drafts when another category starts editing", () => {
    render(<BorrowerFinancialsContent />);
    action("edit", 0); change(field, "Uncommitted");
    const other = kind === "asset" ? "liability" : "asset";
    fireEvent.click(inRow(`button-edit-${other}-0`, nonCurrent));
    expect(card(0)).not.toHaveTextContent("Uncommitted");
    action("edit", 0);
    remove(0);
    expect(screen.queryByTestId(`input-${field}`)).not.toBeInTheDocument();
    expect(within(row(nonCurrent)).queryByTestId(`button-save-${kind}-0`)).not.toBeInTheDocument();
  });

  it("retains category while selecting all type options and closes menus on outside mousedown", () => {
    render(<BorrowerFinancialsContent />);
    action("edit", 0);
    const options = kind === "asset"
      ? ["Checking Account", "Savings Account", "Money Market", "CD", "Stocks/Bonds", "Retirement", "Other"]
      : ["Credit Card", "Auto Loan", "Student Loan", "Mortgage", "Personal Loan", "Other"];
    for (const option of options) select(`${kind}-type`, option);
    action("save", 0);
    expect(card(0)).toHaveTextContent("Other");
    action("more", 0);
    const menu = inRow(`menu-${kind}-0`, nonCurrent);
    fireEvent.mouseDown(menu);
    expect(menu).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(within(row(nonCurrent)).queryByTestId(`menu-${kind}-0`)).not.toBeInTheDocument();
    action("more", 0);
    action("more", 0);
    expect(within(row(nonCurrent)).queryByTestId(`menu-${kind}-0`)).not.toBeInTheDocument();
  });

  it("characterizes known two-row defect: deleting the earlier row hides the active Save", () => {
    render(<BorrowerFinancialsContent />);
    add(); change(field, "Uncommitted added row");
    remove(0);
    expect(card(0)).not.toHaveTextContent("Uncommitted added row");
    expect(within(row(nonCurrent)).queryByTestId(`button-save-${kind}-0`)).not.toBeInTheDocument();
    expect(within(row(nonCurrent)).queryByTestId(`button-save-${kind}-1`)).not.toBeInTheDocument();
    action("edit", 0); change(field, "Recovered through Edit"); action("save", 0);
    expect(card(0)).toHaveTextContent("Recovered through Edit");
    remove(0);
    const other = kind === "asset" ? "liability" : "asset";
    fireEvent.click(inRow(`button-more-${other}-0`, nonCurrent));
    fireEvent.click(inRow(`button-delete-${other}-0`, nonCurrent));
    expect(row(nonCurrent).children).toHaveLength(2); // Headers alone, no empty-state message.
  });
});
