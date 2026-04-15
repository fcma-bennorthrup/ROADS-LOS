import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface RoadsDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  testId?: string;
  variant?: "standalone" | "inline";
}

export function RoadsDropdown({
  value,
  onChange,
  options,
  placeholder = "Select",
  testId,
  variant = "standalone",
}: RoadsDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  return (
    <div style={{ position: "relative", flex: variant === "inline" ? 1 : undefined }} ref={containerRef}>
      {variant === "standalone" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="label-strong"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
            backgroundColor: "var(--roads-bg-primary)",
            border: "1px solid var(--roads-border-dark)",
            borderRadius: "var(--roads-radius-2xs)",
            color: value ? "var(--roads-text-primary)" : "var(--roads-text-secondary)",
            cursor: "pointer",
            lineHeight: "20px",
            height: 44,
          }}
          data-testid={testId}
        >
          <span>{selectedLabel || placeholder}</span>
          <ChevronDown style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            height: "20px",
            gap: "var(--roads-spacing-component-xs)",
          }}
          data-testid={testId}
        >
          <span
            className="label-strong"
            style={{
              flex: 1,
              textAlign: "left",
              color: "var(--roads-text-primary)",
              lineHeight: "20px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {selectedLabel || value || placeholder}
          </span>
          <ChevronDown style={{ width: 16, height: 16, flexShrink: 0, color: "var(--roads-icon-dark)" }} />
        </button>
      )}

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "100%",
            zIndex: 50,
            backgroundColor: "var(--roads-bg-primary)",
            borderRadius: "var(--roads-radius-2xs)",
            boxShadow: "0px 8px 16px rgba(39,51,51,0.24)",
            padding: "var(--roads-spacing-component-xs)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--roads-spacing-component-xs)",
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={isSelected ? "label-strong" : "body-100"}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 12px",
                  background: "none",
                  border: "none",
                  borderRadius: "var(--roads-radius-2xs)",
                  cursor: "pointer",
                  color: isSelected ? "var(--roads-text-brand)" : "var(--roads-text-primary)",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = "var(--roads-bg-light)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                }}
                data-testid={testId ? `${testId}-option-${opt.value.toLowerCase().replace(/[\s\/]+/g, "-")}` : undefined}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <Check style={{ width: 20, height: 20, color: "var(--roads-text-brand)", flexShrink: 0, marginLeft: 8 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
