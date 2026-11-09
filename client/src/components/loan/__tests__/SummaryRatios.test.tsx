import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SummaryRatios, type SummaryRatiosData } from "../SummaryRatios";
import type { PitiBreakdown } from "@shared/summary";
import LoanSummaryPage from "@/pages/loan-summary";
import { applicationView, type LoanApplication } from "@shared/loan-application";

const query = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("@/hooks/use-loan-query", () => ({ useLoanQuery: () => query }));
vi.mock("wouter", () => ({ useParams: () => ({ id: "test" }) }));
vi.mock("../LoanHeader", () => ({ LoanHeader: () => null, BottomToolbar: () => null }));
vi.mock("../BorrowerCards", () => ({ BorrowerCards: () => null }));
vi.mock("../LoanActivityPanel", () => ({ LoanActivityPanel: () => null }));

const data: SummaryRatiosData = {
  piti: "20.00", dti: "25.00", lcv: "50.00", pweCbScore: null, ruleOfXx: null,
  totalCv: "$200,000.00", cashReserves: "—", totalLoanAmount: "$100,000.00",
  amountRequested: "$100,000.00", financedFees: "$0.00", taxesInsurance: "—",
  product: "Fixed", finalRate: "6.00%", principalInterest: "$700.00",
  totalMonthlyPayment: "$1,000.00", cashToClose: "—", apr: "",
};
const breakdown: PitiBreakdown = {
  principal: 200, interest: 500, taxes: 200, insurance: 100,
  totalHousingCosts: 1000, grossMonthlyIncome: 5000, percentage: 20,
};

describe("Summary saved-data UI and PITI breakdown", () => {
  it("opens a numeric first-payment breakdown on hover", async () => {
    const user = userEvent.setup();
    render(<SummaryRatios data={data} pitiBreakdown={breakdown} />);
    await user.hover(screen.getByTestId("text-piti"));
    const tooltip = within(await screen.findByRole("tooltip"));
    expect(tooltip.getByText("First-payment monthly breakdown")).toBeInTheDocument();
    for (const label of ["Monthly principal", "Monthly interest", "Monthly property taxes", "Monthly insurance", "Total monthly housing costs", "Combined gross monthly income", "PITI percentage"]) {
      expect(tooltip.getByText(label)).toBeInTheDocument();
    }
    expect(tooltip.getAllByText("$200.00")).toHaveLength(2);
    for (const value of ["$500.00", "$100.00", "$1,000.00", "$5,000.00", "20.00%"]) {
      expect(tooltip.getByText(value)).toBeInTheDocument();
    }
    await user.unhover(screen.getByTestId("text-piti"));
    // jsdom has no layout: explicitly leave Radix's hoverable-content grace area.
    fireEvent.pointerMove(document.body, { clientX: 500, clientY: 500 });
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("opens on keyboard focus even for an unavailable PITI and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<SummaryRatios data={{ ...data, piti: "" }} pitiBreakdown={{ ...breakdown, taxes: null, insurance: null, totalHousingCosts: null, percentage: null }} />);
    await user.tab();
    expect(screen.getByTestId("text-piti")).toHaveFocus();
    expect(screen.getByTestId("text-piti")).toHaveTextContent("—");
    const tooltip = within(await screen.findByRole("tooltip"));
    expect(tooltip.getAllByText("Unavailable")).toHaveLength(4);
    expect(tooltip.getByText("$5,000.00")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders unavailable outputs and actual blockers rather than legacy sample values on the page", async () => {
    query.data = applicationView({
      loan: { id: "test", amountRequested: "123456", piti: "99", apr: "99", pweCbScore: 800 },
      borrowers: [], mode: "empty", generation: 0, revision: 0, sections: {},
    } as unknown as LoanApplication);
    render(<LoanSummaryPage />);
    for (const field of ["piti", "dti", "lcv", "pwe-cb-score", "rule-of-xx", "total-cv", "cash-reserves", "total-loan-amount", "amount-requested", "financed-fees", "taxes-insurance", "cash-to-close", "product", "final-rate", "apr", "principal-interest", "total-monthly-payment"]) {
      expect(screen.getByTestId(`text-${field}`)).toHaveTextContent("—");
    }
    expect(screen.queryByTestId("summary-missing-inputs")).not.toBeInTheDocument();
  });

  it("renders saved authoritative amounts, zero financed fees and matching L/CV on the page", () => {
    query.data = applicationView({
      loan: { id: "test", financedFees: "999", piti: "99", product: "Sample" },
      borrowers: [], mode: "existing", generation: 0, revision: 0,
      sections: {
        "loan-details": { requestedLoanAmount: "150000" }, fees: [],
        "evaluation-1": { estimatedValue: "200000" },
      },
    } as unknown as LoanApplication);
    render(<LoanSummaryPage />);
    expect(screen.getByTestId("text-total-loan-amount")).toHaveTextContent("$150,000.00");
    expect(screen.getByTestId("text-amount-requested")).toHaveTextContent("$150,000.00");
    expect(screen.getByTestId("text-financed-fees")).toHaveTextContent("$0.00");
    expect(screen.getByTestId("text-total-cv")).toHaveTextContent("$200,000.00");
    expect(screen.getByTestId("text-lcv")).toHaveTextContent("75.00%");
    expect(screen.getByTestId("text-product")).toHaveTextContent("—");
    expect(screen.getByTestId("text-piti")).toHaveTextContent("—");
  });
});
