export interface ChangeLogEntry {
  id: number;
  field: string;
  previousValue: string;
  newValue: string;
  changedBy: string;
  position: string;
  timestamp: string;
  section: string;
  navItem: string;
}

const SECTION_TO_NAV: Record<string, string> = {
  "Borrower Information": "Borrower Information",
  "Loan Details": "Loan Details",
  "Collateral": "Collateral",
  "Product & Pricing": "Product & Pricing",
  "Fees": "Fees",
  "Decisioning": "Decisioning",
};

// No history source exists yet. Never substitute another loan's demo records.
export const CHANGE_LOG: ChangeLogEntry[] = [];

export const ITEMS_PER_PAGE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

export const COLUMNS = [
  { key: "field" as const, label: "Field", width: "16.3%" },
  { key: "previousValue" as const, label: "Previous value", width: "16.3%" },
  { key: "newValue" as const, label: "New value", width: "16.3%" },
  { key: "changedBy" as const, label: "Changed by", width: "13.4%" },
  { key: "position" as const, label: "Position", width: "10.9%" },
  { key: "timestamp" as const, label: "Timestamp", width: "12.7%" },
  { key: "linkToField" as const, label: "Link to field", width: "14.1%" },
];
