/** Retired demo assets must not be downloaded again by a later GitHub pull.
 * This is a bounded asset list, not a blanket PDF exclusion: reference documents
 * and any future explicitly added PDFs retain the normal binary sync policy.
 */
export const RETIRED_PROTOTYPE_PDFS = new Set([
  "client/public/at-app-disclosures.pdf",
  "client/public/decision-letter.pdf",
  "client/public/loan-estimate.pdf",
  "attached_assets/Sample-Loan-Estimate_1776089511706.pdf",
  "attached_assets/Test_25591_4_9c1ebd4dbd_single_adhoc_test_run_(1)_1776280671096.pdf",
  "attached_assets/experian-sample-report_(1)_1776280916046.pdf",
  "attached_assets/rick_1776281894830.pdf",
  "attached_assets/SampleCD_1777397678654.pdf",
  "attached_assets/Redacted-ClosingPackage_Redacted_1777397693832.pdf",
  "attached_assets/Rate_Lock_Letter_-_Consumer_Redacted_1777397784766.pdf",
]);
