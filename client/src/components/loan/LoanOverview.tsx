export interface LoanOverviewData {
  amountRequested: string;
  financedFees: string;
  taxesInsurance: string;
  product: string;
  finalRate: string;
  principalInterest: string;
  totalMonthlyPayment: string;
}

interface KeyValueRowProps {
  label: string;
  value: string;
  testId: string;
}

function KeyValueRow({ label, value, testId }: KeyValueRowProps) {
  return (
    <div
      className="flex items-center justify-between gap-roads-xs"
      style={{ padding: "var(--roads-spacing-component-xs) 0" }}
    >
      <span
        className="body-100"
        style={{ color: "var(--roads-text-secondary)" }}
        data-testid={`label-${testId}`}
      >
        {label}
      </span>
      <span
        className="body-200-strong"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid={`text-${testId}`}
      >
        {value}
      </span>
    </div>
  );
}

const defaultData: LoanOverviewData = {
  amountRequested: "$145,000.00",
  financedFees: "$4,455.00",
  taxesInsurance: "$1,000.00",
  product: "1/1 ARM 2/6 caps",
  finalRate: "7.255%",
  principalInterest: "$1,000.00",
  totalMonthlyPayment: "$1,650.00",
};

interface LoanOverviewProps {
  data?: LoanOverviewData;
}

export function LoanOverview({ data = defaultData }: LoanOverviewProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2"
      style={{ gap: "var(--roads-spacing-component-m)" }}
      data-testid="section-loan-overview"
    >
      <div
        style={{
          border: "1px solid var(--roads-border-subtle)",
          borderRadius: "var(--roads-radius-xs)",
          padding: "var(--roads-spacing-component-xs)",
        }}
        data-testid="card-loan-overview-left"
      >
        <KeyValueRow
          label="Amount Requested"
          value={data.amountRequested}
          testId="amount-requested"
        />
        <KeyValueRow
          label="Financed Fees"
          value={data.financedFees}
          testId="financed-fees"
        />
        <KeyValueRow
          label="Taxes & Insurance"
          value={data.taxesInsurance}
          testId="taxes-insurance"
        />
      </div>

      <div
        style={{
          border: "1px solid var(--roads-border-subtle)",
          borderRadius: "var(--roads-radius-xs)",
          padding: "var(--roads-spacing-component-xs)",
        }}
        data-testid="card-loan-overview-right"
      >
        <KeyValueRow
          label="Product"
          value={data.product}
          testId="product"
        />
        <KeyValueRow
          label="Final Rate"
          value={data.finalRate}
          testId="final-rate"
        />
        <KeyValueRow
          label="Principal & Interest"
          value={data.principalInterest}
          testId="principal-interest"
        />
        <KeyValueRow
          label="Total Monthly Payment"
          value={data.totalMonthlyPayment}
          testId="total-monthly-payment"
        />
      </div>
    </div>
  );
}
