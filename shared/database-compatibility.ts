export interface DatabaseCompatibilityReport {
  status: "compatible" | "needs-upgrade" | "blocked" | "unavailable";
  message: string;
  pending: string[];
  issues: string[];
  documentVersion: number;
  checkedLoans: number;
}
