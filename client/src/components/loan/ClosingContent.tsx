import { useState, useRef } from "react";
import { Pencil } from "lucide-react";
import { RoadsDatePicker } from "./RoadsDatePicker";

interface ClosingDetailsState {
  closingDate: string;
  preClosingReviewComplete: boolean;
}

export function ClosingContent() {
  const defaultState: ClosingDetailsState = {
    closingDate: "",
    preClosingReviewComplete: false,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState<ClosingDetailsState>({ ...defaultState });
  const savedFields = useRef<ClosingDetailsState>({ ...defaultState });

  const handleEditToggle = () => {
    if (!isEditing) {
      savedFields.current = { ...fields };
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    savedFields.current = { ...fields };
    setIsEditing(false);
  };

  const handleDiscard = () => {
    setFields({ ...savedFields.current });
    setIsEditing(false);
  };

  const setField = <K extends keyof ClosingDetailsState>(key: K) => (value: ClosingDetailsState[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-3xl)",
        gap: "var(--roads-spacing-component-xl)",
      }}
      data-testid="closing-content"
    >
      <h2
        className="headline-200"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="text-closing-details-title"
      >
        Closing Details
      </h2>

      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xl)" }}>
        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
          <div className="flex" style={{ gap: "var(--roads-spacing-component-l)" }}>
            <div
              className="flex flex-col"
              style={{ flex: "1 1 0", gap: "var(--roads-spacing-component-xs)" }}
              data-testid="closing-detail-field-closing-date"
            >
              <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
                Closing Date
              </span>
              <RoadsDatePicker
                value={fields.closingDate}
                onChange={setField("closingDate")}
                disabled={!isEditing}
                testId="input-closing-date"
              />
            </div>
            <div style={{ flex: "1 1 0" }} />
            <div style={{ flex: "1 1 0" }} />
            <div style={{ flex: "1 1 0" }} />
            <div style={{ flex: "1 1 0" }} />
          </div>

          <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xl)" }}>
            <label
              className="flex items-center body-100"
              style={{
                gap: "var(--roads-spacing-component-xs)",
                color: isEditing ? "var(--roads-text-primary)" : "var(--roads-text-secondary)",
                cursor: isEditing ? "pointer" : "default",
              }}
              data-testid="checkbox-pre-closing-review-complete"
            >
              <input
                type="checkbox"
                checked={fields.preClosingReviewComplete}
                onChange={(e) => setField("preClosingReviewComplete")(e.target.checked)}
                disabled={!isEditing}
                style={{
                  width: "var(--roads-spacing-component-l)",
                  height: "var(--roads-spacing-component-l)",
                  border: isEditing ? "1px solid var(--roads-border-dark)" : "1px solid var(--roads-border-subtle)",
                  borderRadius: "var(--roads-radius-2xs)",
                  accentColor: "var(--roads-bg-action)",
                  cursor: isEditing ? "pointer" : "default",
                  flexShrink: 0,
                }}
              />
              Pre-closing review complete
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end">
          {isEditing ? (
            <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
              <button
                onClick={handleDiscard}
                className="body-200-strong"
                style={{
                  backgroundColor: "var(--roads-bg-error)",
                  border: "1px solid var(--roads-bg-error)",
                  borderRadius: "var(--roads-radius-2xs)",
                  padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                  color: "var(--roads-text-reverse)",
                  cursor: "pointer",
                }}
                data-testid="button-discard-closing-details"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSave}
                className="body-200-strong"
                style={{
                  backgroundColor: "var(--roads-bg-action)",
                  color: "var(--roads-text-reverse)",
                  border: "1px solid var(--roads-bg-action)",
                  borderRadius: "var(--roads-radius-2xs)",
                  padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                  cursor: "pointer",
                }}
                data-testid="button-save-closing-details"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <button
              onClick={handleEditToggle}
              className="body-200-strong flex items-center"
              style={{
                backgroundColor: "var(--roads-bg-primary)",
                border: "1px solid var(--roads-border-dark)",
                borderRadius: "var(--roads-radius-2xs)",
                padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                color: "var(--roads-text-primary)",
                gap: "var(--roads-spacing-component-2xs)",
                cursor: "pointer",
              }}
              data-testid="button-edit-closing-details"
            >
              <Pencil
                style={{
                  width: "var(--roads-spacing-component-m)",
                  height: "var(--roads-spacing-component-m)",
                }}
              />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
