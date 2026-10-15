import { useState, type ReactNode } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";

export const click = (id: string) => fireEvent.click(screen.getByTestId(id.replace(/^personal-/, "borrower-info-")));
export const change = (id: string, value: string) =>
  fireEvent.change(screen.getByTestId(id), { target: { value } });
export function choose(id: string, value: string) {
  click(id);
  click(`${id}-option-${value.toLowerCase().replace(/[\s/]+/g, "-")}`);
}
function Lifetime({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(true);
  const { tasks, resetDemoTasks, getActionStatus } = useChecklist();
  return <>
    <button onClick={() => setMounted(v => !v)}>Toggle section fixture</button>
    <button onClick={() => resetDemoTasks(tasks.map(task => task.name))}>Reset fixture</button>
    <output data-testid="rate-status">{getActionStatus("Rate Lock", 0)}</output>
    {mounted && children}
  </>;
}
export function Providers({ children }: { children: ReactNode }) {
  return <LoanActivityProvider><ChecklistProvider>
    <Lifetime>{children}</Lifetime>
  </ChecklistProvider></LoanActivityProvider>;
}
