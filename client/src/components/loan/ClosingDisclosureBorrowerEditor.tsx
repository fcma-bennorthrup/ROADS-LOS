import { useRef, useState } from "react";
import type { DisclosureBorrower, BorrowerDisclosureDetails, DisclosureEditSnapshot } from "@/lib/closing-disclosure-borrowers";
import {
  beginDisclosureEdit,
  blankBorrowerDetails,
  saveDisclosureBorrowers,
  hasSharedDelivery,
  summarizeBorrowerViewing,
  borrowerViewingBadge,
} from "@/lib/closing-disclosure-borrowers";
import type { ClosingDisclosureRecord } from "@/lib/closing-disclosure-history";
import { ClosingDocumentIcon } from "@/components/loan/ClosingDocumentIcon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import "./ClosingDisclosureBorrowers.css";

type Props = {
  loanId: string;
  record: ClosingDisclosureRecord;
  borrowers: DisclosureBorrower[];
};

const methods = ["Blend", "Mail", "Hand Delivery"] as const;

export function ClosingDisclosureBorrowerEditor({ loanId, record, borrowers }: Props) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<DisclosureEditSnapshot | null>(null);
  const [draft, setDraft] = useState<BorrowerDisclosureDetails[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const deliverySource = borrowers.find((borrower) => borrower.isPrimary) ?? borrowers[0];
  const viewing = summarizeBorrowerViewing(draft);
  const saveLock = useRef(false);
  const session = useRef(0);
  const unmatchedCount = snapshot?.baseline.filter(
    (item) => !borrowers.some((borrower) => borrower.id === item.borrowerId),
  ).length ?? 0;

  const startEdit = () => {
    session.current += 1;
    setError("");
    try {
      const freshSnapshot = beginDisclosureEdit(loanId, record.id);
      setSnapshot(freshSnapshot);
      const freshDraft = borrowers.map((borrower) =>
        freshSnapshot.baseline.find((item) => item.borrowerId === borrower.id) ?? blankBorrowerDetails(borrower.id));
      setDraft(freshDraft);
      setApplyToAll(hasSharedDelivery(freshDraft, deliverySource?.id));
    } catch (cause) {
      setSnapshot(null);
      setApplyToAll(false);
      setDraft(borrowers.map((borrower) => blankBorrowerDetails(borrower.id)));
      setError(cause instanceof Error ? cause.message : "Borrower details could not be opened.");
    }
    setOpen(true);
  };

  const dismiss = () => {
    session.current += 1;
    setOpen(false);
    setSnapshot(null);
    setDraft([]);
    setApplyToAll(false);
    setError("");
  };

  const onOpenChange = (nextOpen: boolean) => {
    // Do not offer a misleading "cancel" after a storage commit is already queued.
    if (!nextOpen && saveLock.current) return;
    if (nextOpen) startEdit();
    else dismiss();
  };

  const updateField = (borrowerId: string, field: keyof Omit<BorrowerDisclosureDetails, "borrowerId">, value: string) => {
    const deliveryField = field === "deliveryMethod" || field === "deliveryDate";
    // An individual delivery correction breaks the link; all fields remain editable.
    if (deliveryField && borrowerId !== deliverySource?.id) setApplyToAll(false);
    setDraft((current) => current.map((item) =>
      item.borrowerId === borrowerId || (applyToAll && deliveryField && borrowerId === deliverySource?.id)
        ? { ...item, [field]: value } as BorrowerDisclosureDetails
        : item));
  };

  const toggleApplyDelivery = (checked: boolean) => {
    setApplyToAll(checked);
    if (!checked) return;
    setDraft((current) => {
      const source = current.find((item) => item.borrowerId === deliverySource?.id);
      if (!source) return current;
      return current.map((item) => item.borrowerId === source.borrowerId ? item
        : { ...item, deliveryMethod: source.deliveryMethod, deliveryDate: source.deliveryDate });
    });
  };

  const save = async () => {
    if (!snapshot || !borrowers.length || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    const saveSession = session.current;
    const savingSnapshot = snapshot;
    const savingDraft = draft.map((item) => ({ ...item }));
    try {
      await saveDisclosureBorrowers(loanId, savingSnapshot, savingDraft);
      if (session.current === saveSession) dismiss();
    } catch (cause) {
      if (session.current === saveSession) {
        setError(cause instanceof Error ? cause.message : "Borrower details could not be saved. Your draft is still open.");
      }
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="closing-disclosure-icon-button closing-borrower-edit-trigger"
          aria-label={`Edit Closing Disclosure CD ${record.id}`}
          data-testid={`button-edit-closing-disclosure-${record.id}`}
        >
          <ClosingDocumentIcon kind="edit" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="closing-borrower-sheet" aria-busy={saving}
        onEscapeKeyDown={(event) => { if (saveLock.current) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (saveLock.current) event.preventDefault(); }}>
        <div className="closing-borrower-sheet-layout">
          <SheetHeader className="closing-borrower-sheet-header">
            <SheetTitle className="closing-borrower-sheet-title">Closing Disclosure Delivery</SheetTitle>
            <SheetDescription>ROR does not apply. Only one borrower needs to view the CD.</SheetDescription>
          </SheetHeader>

          <div className="closing-borrower-sheet-body">
            {unmatchedCount > 0 ? (
              <div className="closing-borrower-alert" role="status" data-testid={`notice-unmatched-borrowers-${record.id}`}>
                <p>
                  Saved tracking for {unmatchedCount} borrower {unmatchedCount === 1 ? "ID does" : "IDs do"} not
                  match this loan’s current borrowers. These details are kept unchanged and are not
                  assigned to anyone by name. The fields below show only matching borrower IDs.
                </p>
              </div>
            ) : null}
            {error ? (
              <div className="closing-borrower-alert" role="alert" data-testid={`alert-borrower-editor-${record.id}`}>
                <span className="closing-borrower-alert-mark" aria-hidden="true">!</span>
                <p>{error}</p>
              </div>
            ) : null}

            {borrowers.length === 0 ? (
              <div className="closing-borrower-empty" data-testid={`empty-borrowers-${record.id}`}>
                <span className="closing-borrower-empty-rule" aria-hidden="true" />
                <h3>No borrowers to track</h3>
                <p>Borrower details will be available here when this loan has borrowers.</p>
              </div>
            ) : (
              <div className="closing-borrower-sections">
                {borrowers.map((borrower) => {
                  const details = draft.find((item) => item.borrowerId === borrower.id) ?? blankBorrowerDetails(borrower.id);
                  const badge = borrowerViewingBadge(details, viewing.requirementMet);
                  return (
                    <section className="closing-borrower-section" key={borrower.id} aria-labelledby={`borrower-section-title-${record.id}-${borrower.id}`}>
                      <div className="closing-borrower-section-heading">
                        <div className="closing-borrower-section-identity">
                          <div>
                            <h3 id={`borrower-section-title-${record.id}-${borrower.id}`}>{borrower.name || "Unnamed borrower"}</h3>
                            <span>{borrower.isPrimary ? "Primary Borrower" : "Co-borrower"}</span>
                          </div>
                        </div>
                        <span
                          className={`closing-borrower-status is-${badge.tone} closing-borrower-viewing-badge`}
                          data-testid={`badge-borrower-viewing-${borrower.id}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <div className="closing-borrower-fields">
                        <div className="closing-borrower-field">
                          <div className="closing-borrower-field-label-row">
                            <label htmlFor={`delivery-method-${record.id}-${borrower.id}`}>Delivery Method</label>
                            <details className="closing-borrower-help">
                              <summary aria-label="About delivery method" aria-describedby={`delivery-help-${record.id}-${borrower.id}`}>?</summary>
                              <span id={`delivery-help-${record.id}-${borrower.id}`} role="tooltip">
                                Manual tracking only. No disclosure documents are sent.
                              </span>
                            </details>
                          </div>
                          <select
                            id={`delivery-method-${record.id}-${borrower.id}`}
                            value={details.deliveryMethod}
                            onChange={(event) => updateField(borrower.id, "deliveryMethod", event.target.value)}
                            disabled={!snapshot || saving}
                            data-testid={`select-delivery-method-${borrower.id}`}
                          >
                            <option value="">Select a method</option>
                            {methods.map((method) => <option value={method} key={method}>{method}</option>)}
                          </select>
                        </div>
                        <label className="closing-borrower-field">
                          <span>Delivery Date</span>
                          <input
                            type="date"
                            value={details.deliveryDate}
                            onChange={(event) => updateField(borrower.id, "deliveryDate", event.target.value)}
                            disabled={!snapshot || saving}
                            data-testid={`input-delivery-date-${borrower.id}`}
                          />
                        </label>
                        <label className="closing-borrower-field">
                          <span>CD Viewed</span>
                          <select
                            value={details.cdViewed}
                            onChange={(event) => updateField(borrower.id, "cdViewed", event.target.value)}
                            disabled={!snapshot || saving}
                            data-testid={`select-cd-viewed-${borrower.id}`}
                          >
                            <option value="">Not recorded</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </label>
                        <label className="closing-borrower-field">
                          <span>Date CD Viewed</span>
                          <input
                            type="date"
                            value={details.viewedDate}
                            onChange={(event) => updateField(borrower.id, "viewedDate", event.target.value)}
                            disabled={!snapshot || saving}
                            data-testid={`input-viewed-date-${borrower.id}`}
                          />
                        </label>
                      </div>
                      {borrowers.length > 1 && borrower.id === deliverySource?.id ? (
                        <label className="closing-borrower-apply">
                          <input
                            type="checkbox"
                            checked={applyToAll}
                            onChange={(event) => toggleApplyDelivery(event.target.checked)}
                            disabled={saving || !snapshot}
                            data-testid={`checkbox-apply-delivery-${borrower.id}`}
                          />
                          <span>Apply delivery details to all borrowers</span>
                        </label>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          <SheetFooter className="closing-borrower-sheet-footer">
            <button type="button" className="closing-borrower-cancel" disabled={saving}
              onClick={() => { if (!saveLock.current) dismiss(); }} data-testid={`button-cancel-borrower-edit-${record.id}`}>
              Cancel
            </button>
            <button
              type="button"
              className="closing-borrower-save"
              onClick={save}
              disabled={!snapshot || !borrowers.length || saving}
              data-testid={`button-save-borrower-edit-${record.id}`}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
