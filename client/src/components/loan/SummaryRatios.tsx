import type { PitiBreakdown } from "@shared/summary";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface SummaryRatiosData {
  piti: string;
  dti: string;
  lcv: string;
  pweCbScore: number | null;
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
  cashToClose: string;
  apr: string;
}

function KeyValueRow({ label, value, testId, tooltip }: { label: string; value: string; testId: string; tooltip?: React.ReactNode }) {
  const valueElement = <span
    className="body-100"
    style={{ color: "var(--roads-text-primary)" }}
    data-testid={`text-${testId}`}
    {...(tooltip ? { tabIndex: 0, "aria-label": `${label}: ${value}. Show calculation breakdown` } : {})}
  >{value}</span>;
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
      {tooltip ? <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{valueElement}</TooltipTrigger>
          <TooltipContent side="bottom" data-testid="tooltip-piti">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider> : valueElement}
    </div>
  );
}

function DataColumn({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <div
      className="flex flex-col min-w-0"
      style={{
        gap: "var(--roads-spacing-component-m)",
        padding: "var(--roads-spacing-component-xs)",
        borderRadius: "var(--roads-radius-xs)",
      }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

function PitiDetails({ breakdown }: { breakdown: PitiBreakdown }) {
  const money = (value: number | null) => value === null ? "Unavailable" : value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const rows = [
    ["Monthly principal", money(breakdown.principal)],
    ["Monthly interest", money(breakdown.interest)],
    ["Monthly property taxes", money(breakdown.taxes)],
    ["Monthly insurance", money(breakdown.insurance)],
    ["Total monthly housing costs", money(breakdown.totalHousingCosts)],
    ["Combined gross monthly income", money(breakdown.grossMonthlyIncome)],
    ["PITI percentage", breakdown.percentage === null ? "Unavailable" : `${breakdown.percentage.toFixed(2)}%`],
  ];
  return <div className="max-w-sm space-y-2">
    <p className="font-semibold">First-payment monthly breakdown</p>
    <dl>{rows.map(([label, value]) => <div className="flex justify-between gap-4" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>PITI = (principal + interest + taxes + insurance) ÷ combined gross monthly income × 100.</p>
    <p>First scheduled principal and interest, not a term average. Missing inputs are unavailable, never assumed zero.</p>
  </div>;
}

export function SummaryRatios({ data, missing = [], pitiBreakdown }: { data: SummaryRatiosData; missing?: string[]; pitiBreakdown?: PitiBreakdown }) {
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
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 w-full"
        style={{ gap: "var(--roads-spacing-component-xl)" }}
      >
        <DataColumn testId="column-ratios">
          <KeyValueRow label="PITI" value={data.piti ? `${data.piti}%` : "—"} testId="piti"
            tooltip={pitiBreakdown ? <PitiDetails breakdown={pitiBreakdown} /> : undefined} />
          <KeyValueRow label="DTI" value={data.dti ? `${data.dti}%` : "—"} testId="dti" />
          <KeyValueRow label="L/CV" value={data.lcv ? `${data.lcv}%` : "—"} testId="lcv" />
          <KeyValueRow label="PWE CB Score" value={data.pweCbScore === null ? "—" : String(data.pweCbScore)} testId="pwe-cb-score" />
        </DataColumn>

        <DataColumn testId="column-reserves">
          <KeyValueRow label="Rule of XX" value={data.ruleOfXx ?? "—"} testId="rule-of-xx" />
          <KeyValueRow label="Total CV" value={data.totalCv} testId="total-cv" />
          <KeyValueRow label="Cash Reserves" value={data.cashReserves} testId="cash-reserves" />
        </DataColumn>

        <DataColumn testId="column-amounts">
          <KeyValueRow label="Total Loan Amount" value={data.totalLoanAmount} testId="total-loan-amount" />
          <KeyValueRow label="Amount Requested" value={data.amountRequested} testId="amount-requested" />
          <KeyValueRow label="Financed Fees" value={data.financedFees} testId="financed-fees" />
          <KeyValueRow label="Taxes & Insurance" value={data.taxesInsurance} testId="taxes-insurance" />
          <KeyValueRow label="Cash to Close" value={data.cashToClose} testId="cash-to-close" />
        </DataColumn>

        <DataColumn testId="column-product">
          <KeyValueRow label="Product" value={data.product} testId="product" />
          <KeyValueRow label="Final Rate" value={data.finalRate} testId="final-rate" />
          <KeyValueRow label="APR" value={data.apr ? `${data.apr}%` : "—"} testId="apr" />
          <KeyValueRow label="Principal & Interest" value={data.principalInterest} testId="principal-interest" />
          <KeyValueRow label="Total Monthly Payment" value={data.totalMonthlyPayment} testId="total-monthly-payment" />
        </DataColumn>
      </div>
      {missing.length > 0 && <details className="body-100" style={{ color: "var(--roads-text-secondary)" }} data-testid="summary-missing-inputs">
        <summary className="cursor-pointer">Unavailable calculations · missing data or definitions</summary>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          {missing.map(message => <li key={message}>{message}</li>)}
        </ul>
      </details>}
    </section>
  );
}
