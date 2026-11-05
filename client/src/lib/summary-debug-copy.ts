/** Presentation copy only: calculation rules and missing-data detection stay unchanged. */
export function summaryDebugCopy(message: string): string {
  const label = message.split(":")[0]
    .replace("noncurrent-liabilities", "Noncurrent liabilities")
    .replace("current-liabilities", "Current liabilities")
    .replace("Income borrower", "Borrower");
  if (/non-finite|numeric range/.test(message)) return `${label}: check for amounts that are too large or entered incorrectly.`;
  if (message.startsWith("amountRequested:")) return "Amount Requested: enter and save the loan amount in Loan Details.";
  if (message.startsWith("financedFees:")) return "Financed Fees: review and save Fees, including amounts, payer, and payment method. Only Cash is supported today.";
  if (message.startsWith("totalLoanAmount:")) return "Total Loan Amount: save the requested amount and complete the fee details.";
  if (/^(product|finalRate):/.test(message)) return "Product & Rate: save a product in Product & Pricing. No rate lock needed.";
  if (message.startsWith("principalInterest:")) {
    if (message.includes("ARM")) return "Principal & Interest: ARM payment calculations need an amortization term and rate-adjustment schedule; these are not supported yet.";
    if (message.includes("whole-month")) return "Principal & Interest: enter a term greater than zero, in whole months, in Product & Pricing.";
    return "Principal & Interest: save the loan amount, fees, fixed-rate product, and term.";
  }
  if (message.startsWith("taxesInsurance:")) return message.includes("Monthly Property Taxes")
    ? "Taxes & Insurance: save Monthly Property Taxes in Collateral. Enter 0 if none."
    : "Taxes & Insurance: save Monthly Insurance in Collateral. Enter 0 if none.";
  if (/^(totalMonthlyPayment|Housing):/.test(message)) return "Monthly Payment: complete pricing, loan amount, fees, and monthly taxes and insurance.";
  if (message.startsWith("apr:")) return "APR: not supported yet. We need APR fee classifications, funding date, and payment dates.";
  if (message.startsWith("Cash Reserves:")) return "Cash Reserves: define which assets count and what closing costs to deduct.";
  if (message.startsWith("Cash to Close:")) return "Cash to Close: define how down payment, fees, deposits, credits, and payoffs should be combined.";
  if (message.startsWith("PWE CB Score:")) return "PWE CB Score: add saved bureau scores and define which score to use.";
  if (message.startsWith("Rule of XX:")) return "Rule of XX: define the formula and required inputs.";
  if (message.startsWith("Total CV:")) return "Total CV: save a value greater than zero for each active appraisal in Collateral. Reported Value Total takes priority over Estimated Value.";
  if (message.startsWith("L/CV:")) return "L/CV: complete Total Loan Amount and Total CV.";
  if (message.includes("extra borrower")) return "Income: match each income record to a borrower on this loan.";
  if (message.includes("historical-job")) return `${label}: decide whether previous-job income should count.`;
  if (message.includes("positive gross")) return "Income: save gross income greater than zero to calculate PITI and DTI.";
  if (/^(Income|Income borrower)/.test(message)) return `${label}: add and save income in Borrower Financials. Enter monthly or annual amounts; enter 0 if none.`;
  if (message.includes("duplicate liability")) return `${label}: review duplicate accounts on the Balance Sheet.`;
  if (message.includes("planned-payoff")) return `${label}: decide whether debts marked To Be Paid Off should count toward DTI.`;
  if (message.includes("paid-off status")) return `${label}: select Yes or No for To Be Paid Off on the Balance Sheet.`;
  if (message.includes("monthly payment is missing")) return `${label}: save a Monthly Payment on the Balance Sheet. Enter 0 if none.`;
  if (message.includes("saved liabilities")) return `${label}: review and save this section of the Balance Sheet, even if there are no accounts.`;
  return message;
}
