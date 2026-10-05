import { useRef, useState } from "react";
import type { DisclosureBorrower, BorrowerDisclosureDetails, DisclosureEditSnapshot } from "@/lib/closing-disclosure-borrowers";
import {
  beginDisclosureEdit,
  blankBorrowerDetails,
  saveDisclosureBorrowers,
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
  const saveLock = useRef(false);
  const session = useRef(0);

  const startEdit = () => {
    session.current += 1;
    setError("");
    try {
      const freshSnapshot = beginDisclosureEdit(loanId, record.id);
      setSnapshot(freshSnapshot);
      setDraft(borrowers.map((borrower) =>
        freshSnapshot.baseline.find((item) => item.borrowerId === borrower.id) ?? blankBorrowerDetails(borrower.id)));
    } catch (cause) {
      setSnapshot(null);
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
    setError("");
  };

  const onOpenChange = (nextOpen: boolean) => {
    // Do not offer a misleading "cancel" after a storage commit is already queued.
    if (!nextOpen && saveLock.current) return;
    if (nextOpen) startEdit();
    else dismiss();
  };

  const updateField = (borrowerId: string, field: keyof Omit<BorrowerDisclosureDetails, "borrowerId">, value: string) => {
    setDraft((current) => current.map((item) => item.borrowerId === borrowerId
      ? { ...item, [field]: value } as BorrowerDisclosureDetails
      : item));
  };

  const applyDelivery = (borrowerId: string) => {
    const source = draft.find((item) => item.borrowerId === borrowerId);
    if (!source) return;
    setDraft((current) => current.map((item) => item.borrowerId === borrowerId
      ? item
      : { ...item, deliveryMethod: source.deliveryMethod, deliveryDate: source.deliveryDate }));
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
            <span className="closing-borrower-eyebrow">MANUAL BORROWER TRACKING</span>
            <SheetTitle className="closing-borrower-sheet-title">Edit Closing Disclosure — CD {record.id}</SheetTitle>
            <SheetDescription>
              Record delivery and viewing details for each borrower. These notes do not deliver or change the disclosure.
            </SheetDescription>
          </SheetHeader>

          <div className="closing-borrower-sheet-body">
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
                {borrowers.map((borrower, index) => {
                  const details = draft.find((item) => item.borrowerId === borrower.id) ?? blankBorrowerDetails(borrower.id);
                  return (
                    <section className="closing-borrower-section" key={borrower.id} aria-labelledby={`borrower-section-title-${record.id}-${borrower.id}`}>
                      <div className="closing-borrower-section-heading">
                        <div className="closing-borrower-section-identity">
                          <span className="closing-borrower-index">{String(index + 1).padStart(2, "0")}</span>
                          <div>
                            <h3 id={`borrower-section-title-${record.id}-${borrower.id}`}>{borrower.name || "Unnamed borrower"}</h3>
                            <span>{borrower.isPrimary ? "Primary borrower" : "Co-borrower"}</span>
                          </div>
                        </div>
                        {borrowers.length > 1 ? (
                          <button
                            type="button"
                            className="closing-borrower-copy-button"
                            onClick={() => applyDelivery(borrower.id)}
                            disabled={saving || !snapshot}
                            data-testid={`button-apply-delivery-${borrower.id}`}
                          >
                            Apply delivery details to all borrowers
                          </button>
                        ) : null}
                      </div>

                      <div className="closing-borrower-fields">
                        <label className="closing-borrower-field">
                          <span>Delivery Method</span>
                          <select
                            value={details.deliveryMethod}
                            onChange={(event) => updateField(borrower.id, "deliveryMethod", event.target.value)}
                            disabled={!snapshot || saving}
                            data-testid={`select-delivery-method-${borrower.id}`}
                          >
                            <option value="">Select a method</option>
                            {methods.map((method) => <option value={method} key={method}>{method}</option>)}
                          </select>
                        </label>
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
              {saving ? "Saving…" : "Save changes"}
            </button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
