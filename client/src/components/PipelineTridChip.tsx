import { useEffect, useState } from "react";
import type { PipelineLoan } from "@shared/pipeline";

/** Calendar dates in the viewer's local timezone, not elapsed 24-hour periods. */
export function tridCalendarDay(triggeredAt: string, now: Date): number | null {
  const start = new Date(triggeredAt);
  if (!Number.isFinite(start.getTime())) return null;
  const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(0, Math.round((day(now) - day(start)) / 86_400_000));
}

export function PipelineTridChip({ loan }: { loan: PipelineLoan }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  if (loan.tridStatus !== "required" || !loan.tridTriggeredAt) return null;
  const day = tridCalendarDay(loan.tridTriggeredAt, now);
  if (day === null) return null;
  return <span className={`pipeline-trid-chip caption-100-strong pipeline-trid-${day === 0 ? "initial" : day < 3 ? "warning" : "late"}`}
    aria-label={`TRID day ${day}`}>Day {day}</span>;
}
