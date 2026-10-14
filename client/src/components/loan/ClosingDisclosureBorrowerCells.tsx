import { useMemo } from "react";
import {
  detailsForBorrowers,
  formatCalendarDate,
  summarizeBorrowerField,
  summarizeBorrowerViewing,
  summarizeAssumedDeliveryDate,
  type DisclosureBorrower,
} from "@/lib/closing-disclosure-borrowers";
import type { ClosingDisclosureRecord } from "@/lib/closing-disclosure-history";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import "./ClosingDisclosureBorrowers.css";

type Props = {
  loanId: string;
  record: ClosingDisclosureRecord;
  borrowers: DisclosureBorrower[];
  deliveryFallback: string;
};

function StatusIcon({ kind, className }: { kind: "check" | "pending" | "unknown" | "down"; className?: string }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">
    {kind === "check" ? <path d="m5 12 4 4L19 6" /> :
      kind === "down" ? <path d="m6 9 6 6 6-6" /> :
        <><circle cx="12" cy="12" r="9" />{kind === "pending" ?
          <path d="M12 7v5m0 5h.01" /> : <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 4h.01" />}</>}
  </svg>;
}

export function ClosingDisclosureBorrowerCells({ loanId, record, borrowers, deliveryFallback }: Props) {
  const parsed = useMemo(() => {
    try {
      return { details: detailsForBorrowers(record, borrowers), error: "" };
    } catch {
      return { details: [], error: "Borrower details unavailable" };
    }
  }, [loanId, record, borrowers]);
  const { details, error } = parsed;

  const deliveryDate = error
    ? error
    : summarizeBorrowerField(details, "deliveryDate") || deliveryFallback;
  const deliveryMethod = error || summarizeBorrowerField(details, "deliveryMethod") || "Not recorded";
  const { allUnrecorded, requirementMet, summary } = summarizeBorrowerViewing(details);
  const viewedSummary = error || summary;
  let assumedDeliveryDate = "";
  if (record.deliveredAt) {
    try {
      assumedDeliveryDate = error || summarizeAssumedDeliveryDate(record, details);
    } catch {
      assumedDeliveryDate = "Assumed delivery date unavailable";
    }
  }

  return (
    <>
      <td className="closing-borrower-cell" data-testid={`text-delivery-date-${record.id}`}>
        {deliveryDate}
      </td>
      <td className="closing-borrower-cell" data-testid={`text-assumed-delivery-date-${record.id}`}>
        {assumedDeliveryDate}
      </td>
      <td className="closing-borrower-cell" data-testid={`text-delivery-method-${record.id}`}>
        {deliveryMethod}
      </td>
      <td className="closing-borrower-cell closing-borrower-viewed-cell">
        {error || details.length === 0 ? (
          <span className={`closing-borrower-status ${error ? "is-error" : "is-neutral"}`} data-testid={`status-cd-viewed-${record.id}`}>
            <StatusIcon kind={error ? "pending" : "unknown"} />
            <span>{viewedSummary}</span>
          </span>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`closing-borrower-summary ${requirementMet ? "is-success" : allUnrecorded ? "is-neutral" : "is-pending"}`}
                aria-label={`CD viewed status for disclosure CD ${record.id}: ${viewedSummary}. View borrower details`}
                data-testid={`button-view-borrower-status-${record.id}`}
              >
                <StatusIcon kind={requirementMet ? "check" : allUnrecorded ? "unknown" : "pending"} />
                <span>{viewedSummary}</span>
                <StatusIcon kind="down" className="closing-borrower-summary-chevron" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="closing-borrower-popover"
              align="start"
              side="bottom"
              aria-label={`Borrower viewing details for CD ${record.id}`}
              data-testid={`popover-borrower-status-${record.id}`}
            >
              <div className="closing-borrower-popover-heading">
                <span className="caption-100-strong">BORROWER STATUS</span>
                <strong>{viewedSummary}</strong>
              </div>
              <ul className="closing-borrower-breakdown">
                {borrowers.map((borrower) => {
                  const detail = details.find((item) => item.borrowerId === borrower.id);
                  const status = detail?.cdViewed === "Yes"
                    ? "Viewed"
                    : detail?.cdViewed === "No"
                      ? "Not viewed"
                      : "Not recorded";
                  return (
                    <li key={`${loanId}-${record.id}-${borrower.id}`} data-testid={`row-borrower-status-${borrower.id}`}>
                      <div className="closing-borrower-breakdown-person">
                        <strong>{borrower.name || "Unnamed borrower"}</strong>
                        <span>{borrower.isPrimary ? "Primary borrower" : "Co-borrower"}</span>
                      </div>
                      <div className={`closing-borrower-breakdown-status ${status === "Viewed" ? "is-success" : status === "Not viewed" && !requirementMet ? "is-pending" : "is-neutral"}`}>
                        <span>{status}</span>
                        {detail?.viewedDate ? <time dateTime={detail.viewedDate}>{formatCalendarDate(detail.viewedDate)}</time> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
        )}
      </td>
    </>
  );
}
