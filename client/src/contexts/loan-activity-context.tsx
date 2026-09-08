import { createContext, useContext, useState, ReactNode } from "react";

interface LoanActivityContextValue {
  activityPanelOpen: boolean;
  toggleActivityPanel: () => void;
  closeActivityPanel: () => void;
}

const LoanActivityContext = createContext<LoanActivityContextValue | null>(null);

export function LoanActivityProvider({ children }: { children: ReactNode }) {
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);

  const toggleActivityPanel = () => setActivityPanelOpen((prev) => !prev);
  const closeActivityPanel = () => setActivityPanelOpen(false);

  return (
    <LoanActivityContext.Provider value={{ activityPanelOpen, toggleActivityPanel, closeActivityPanel }}>
      {children}
    </LoanActivityContext.Provider>
  );
}

export function useActivityPanel(): LoanActivityContextValue {
  const ctx = useContext(LoanActivityContext);
  if (!ctx) throw new Error("useActivityPanel must be used inside <LoanActivityProvider>");
  return ctx;
}
