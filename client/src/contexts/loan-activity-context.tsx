import { createContext, useContext, useState, ReactNode } from "react";

export interface ActivityItem {
  id: number | string;
  title: string;
  description: string;
  timestamp: string;
  date: Date;
  link?: { label: string };
}

const INITIAL_ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: 2,
    title: "Intent to Proceed",
    description: "Intent to Proceed has been provided by Richard Jamerson | CIF: 123456",
    timestamp: "July 8, 2025 3:30pm",
    date: new Date("2025-07-08T15:30:00"),
  },
  {
    id: 5,
    title: "Document Received",
    description: "Tax documents have been uploaded for Richard Jamerson | CIF: 123456",
    timestamp: "July 3, 2025 8:33am",
    date: new Date("2025-07-03T08:33:00"),
    link: { label: "View Document" },
  },
  {
    id: 6,
    title: "Hard Credit Pull Complete",
    description: "Hard Credit pull complete for Richard Jamerson | CIF: 123456",
    timestamp: "July 2, 2025 10:45am",
    date: new Date("2025-07-02T10:45:00"),
    link: { label: "View Credit Report" },
  },
  {
    id: 7,
    title: "Loan Application Submitted",
    description: "Customer 1003 has been submitted by borrower",
    timestamp: "July 2, 2025 10:05am",
    date: new Date("2025-07-02T10:05:00"),
  },
];

interface LoanActivityContextValue {
  activityPanelOpen: boolean;
  activityItems: ActivityItem[];
  toggleActivityPanel: () => void;
  closeActivityPanel: () => void;
  addActivity: (item: ActivityItem) => void;
}

const LoanActivityContext = createContext<LoanActivityContextValue | null>(null);

export function LoanActivityProvider({ children }: { children: ReactNode }) {
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>(INITIAL_ACTIVITY_ITEMS);

  const toggleActivityPanel = () => setActivityPanelOpen((prev) => !prev);
  const closeActivityPanel = () => setActivityPanelOpen(false);
  const addActivity = (item: ActivityItem) => {
    setActivityItems((prev) =>
      prev.some((existing) => existing.id === item.id) ? prev : [...prev, item],
    );
  };

  return (
    <LoanActivityContext.Provider
      value={{ activityPanelOpen, activityItems, toggleActivityPanel, closeActivityPanel, addActivity }}
    >
      {children}
    </LoanActivityContext.Provider>
  );
}

export function useActivityPanel(): LoanActivityContextValue {
  const ctx = useContext(LoanActivityContext);
  if (!ctx) throw new Error("useActivityPanel must be used inside <LoanActivityProvider>");
  return ctx;
}
