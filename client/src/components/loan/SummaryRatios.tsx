export interface SummaryRatiosData {
  piti: string;
  dti: string;
  lcv: string;
  pweCbScore: number;
  ruleOfXx: string | null;
  totalCv: string;
  cashReserves: string;
  totalLoanAmount: string;
  amountRequested: string;
  financedFees: string;
  taxesInsurance: string;
  product: string;
  finalRate: string;
  principalInterest: string;
  totalMonthlyPayment: string;
}

function KeyValueRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div
      className="flex items-center justify-between w-full"
      data-testid={`row-${testId}`}
    >
      <span
        className="body-100"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid={`label-${testId}`}
      >
        {label}
      </span>
      <span
        className="body-100"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid={`text-${testId}`}
      >
        {value}
      </span>
    </div>
  );
}

function DataColumn({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        gap: "var(--roads-spacing-component-m)",
        padding: "var(--roads-spacing-component-xs)",
        borderRadius: "var(--roads-radius-xs)",
        width: "318px",
      }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function SummaryRatios({ data }: { data: SummaryRatiosData }) {
  return (
    <section
      className="flex flex-col"
      style={{
        gap: "var(--roads-spacing-component-l)",
        padding: "0 var(--roads-spacing-layout-xs)",
      }}
      data-testid="section-summary-ratios"
    >
      <h2
        className="headline-200"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="text-summary-ratios-heading"
      >
        Summary &amp; Ratios
      </h2>
      <div
        className="flex flex-wrap"
        style={{ gap: "var(--roads-spacing-component-xl)" }}
      >
        <DataColumn testId="column-ratios">
          <KeyValueRow label="PITI" value={`${data.piti}%`} testId="piti" />
          <KeyValueRow label="DTI" value={`${data.dti}%`} testId="dti" />
          <KeyValueRow label="L/CV" value={`${data.lcv}%`} testId="lcv" />
          <KeyValueRow label="PWE CB Score" value={String(data.pweCbScore)} testId="pwe-cb-score" />
        </DataColumn>

        <DataColumn testId="column-reserves">
          <KeyValueRow label="Rule of XX" value={data.ruleOfXx ?? "--"} testId="rule-of-xx" />
          <KeyValueRow label="Total CV" value={data.totalCv} testId="total-cv" />
          <KeyValueRow label="Cash Reserves" value={data.cashReserves} testId="cash-reserves" />
        </DataColumn>

        <DataColumn testId="column-amounts">
          <KeyValueRow label="Total Loan Amount" value={data.totalLoanAmount} testId="total-loan-amount" />
          <KeyValueRow label="Amount Requested" value={data.amountRequested} testId="amount-requested" />
          <KeyValueRow label="Financed Fees" value={data.financedFees} testId="financed-fees" />
          <KeyValueRow label="Taxes & Insurance" value={data.taxesInsurance} testId="taxes-insurance" />
        </DataColumn>

        <DataColumn testId="column-product">
          <KeyValueRow label="Product" value={data.product} testId="product" />
          <KeyValueRow label="Final Rate" value={data.finalRate} testId="final-rate" />
          <KeyValueRow label="Principal & Interest" value={data.principalInterest} testId="principal-interest" />
          <KeyValueRow label="Total Monthly Payment" value={data.totalMonthlyPayment} testId="total-monthly-payment" />
        </DataColumn>
      </div>
    </section>
  );
}
