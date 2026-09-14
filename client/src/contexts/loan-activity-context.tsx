import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";

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

const ACTIVITY_STORAGE_PREFIX = "loan-runtime-activity";

function getLoanStorageKey(location: string): string {
  const loanId = location.match(/^\/loans\/([^/]+)/)?.[1] ?? "prototype";
  return `${ACTIVITY_STORAGE_PREFIX}:${loanId}`;
}

function loadActivityItems(storageKey: string): ActivityItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
    if (!Array.isArray(saved)) return INITIAL_ACTIVITY_ITEMS;

    const runtimeItems = saved.flatMap((item): ActivityItem[] => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("id" in item) ||
        (typeof item.id !== "number" && typeof item.id !== "string") ||
        !("title" in item) ||
        typeof item.title !== "string" ||
        !("description" in item) ||
        typeof item.description !== "string" ||
        !("timestamp" in item) ||
        typeof item.timestamp !== "string" ||
        !("date" in item) ||
        (typeof item.date !== "string" && typeof item.date !== "number")
      ) {
        return [];
      }

      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return [];

      const link =
        "link" in item &&
        typeof item.link === "object" &&
        item.link !== null &&
        "label" in item.link &&
        typeof item.link.label === "string"
          ? { label: item.link.label }
          : undefined;

      return [{ id: item.id, title: item.title, description: item.description, timestamp: item.timestamp, date, link }];
    });

    const initialIds = new Set(INITIAL_ACTIVITY_ITEMS.map((item) => item.id));
    return [
      ...INITIAL_ACTIVITY_ITEMS,
      ...runtimeItems.filter((item) => !initialIds.has(item.id)),
    ];
  } catch {
    return INITIAL_ACTIVITY_ITEMS;
  }
}

interface LoanActivityContextValue {
  activityPanelOpen: boolean;
  activityItems: ActivityItem[];
  toggleActivityPanel: () => void;
  closeActivityPanel: () => void;
  addActivity: (item: ActivityItem) => void;
  resetRuntimeActivities: () => void;
}

const LoanActivityContext = createContext<LoanActivityContextValue | null>(null);

function LoanActivityStateProvider({
  children,
  storageKey,
}: {
  children: ReactNode;
  storageKey: string;
}) {
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>(() =>
    loadActivityItems(storageKey),
  );

  useEffect(() => {
    try {
      const initialIds = new Set(INITIAL_ACTIVITY_ITEMS.map((item) => item.id));
      localStorage.setItem(
        storageKey,
        JSON.stringify(activityItems.filter((item) => !initialIds.has(item.id))),
      );
    } catch {
      // The prototype remains usable when browser storage is unavailable.
    }
  }, [activityItems, storageKey]);

  const toggleActivityPanel = () => setActivityPanelOpen((prev) => !prev);
  const closeActivityPanel = () => setActivityPanelOpen(false);
  const addActivity = (item: ActivityItem) => {
    setActivityItems((prev) =>
      prev.some((existing) => existing.id === item.id) ? prev : [...prev, item],
    );
  };
  const resetRuntimeActivities = () =>
    setActivityItems(INITIAL_ACTIVITY_ITEMS.map((item) => ({ ...item })));

  return (
    <LoanActivityContext.Provider
      value={{
        activityPanelOpen,
        activityItems,
        toggleActivityPanel,
        closeActivityPanel,
        addActivity,
        resetRuntimeActivities,
      }}
    >
      {children}
    </LoanActivityContext.Provider>
  );
}

export function LoanActivityProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const storageKey = getLoanStorageKey(location);

  return (
    <LoanActivityStateProvider key={storageKey} storageKey={storageKey}>
      {children}
    </LoanActivityStateProvider>
  );
}

export function useActivityPanel(): LoanActivityContextValue {
  const ctx = useContext(LoanActivityContext);
  if (!ctx) throw new Error("useActivityPanel must be used inside <LoanActivityProvider>");
  return ctx;
}
