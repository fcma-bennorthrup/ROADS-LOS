// Synthetic data only. The test-only transform replaces the private seed array,
// not the parser, handlers, JSX, dropdown, or any on-disk production module.
export const destinations = [
  "Borrower Information", "Loan Details", "Collateral",
  "Product & Pricing", "Fees", "Decisioning",
];

export const records = Array.from({ length: 40 }, (_, index) => ({
  id: index + 1,
  field: `Field-${index + 1}`,
  previousValue: `Before-${index + 1}`,
  newValue: `After-${index + 1}`,
  changedBy: `Actor-${index + 1}`,
  position: `Position-${index + 1}`,
  timestamp: `03/${String(28 - Math.floor(index / 2)).padStart(2, "0")}/2026 ${index % 2 ? "12:00 AM" : "12:00 PM"}`,
  section: destinations[index % 6],
  navItem: destinations[index % 6],
}));
// Boundary dates retain descending seed order but cross year/month boundaries.
records[36].timestamp = "03/01/2026 12:00 AM";
records[37].timestamp = "02/28/2026 11:59 PM";
records[38].timestamp = "01/01/2026 12:00 AM";
records[39].timestamp = "12/31/2025 11:59 PM";

export const loan = {
  id: "synthetic-B", loanNumber: "TEST-002", cifNumber: "TEST-CIF",
  loanType: "Synthetic Loan", primaryBorrowerName: "Fixture Borrower",
  displayAmount: "1234.5", applicationType: "Individual",
  ecoaDaysRemaining: 5, tridDaysRemaining: 3, borrowers: [],
};
