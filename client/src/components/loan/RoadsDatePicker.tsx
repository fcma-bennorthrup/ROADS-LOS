import { useState, useRef, useEffect, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { Calendar } from "lucide-react";

interface RoadsDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  testId?: string;
}

export function RoadsDatePicker({ value, onChange, disabled = false, testId }: RoadsDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  const close = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close(true);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, close]);

  const parsed = parse(value, "MM/dd/yyyy", new Date());
  const selectedDate = isValid(parsed) ? parsed : undefined;

  function handleDaySelect(day: Date | undefined) {
    if (day) {
      onChange(format(day, "MM/dd/yyyy"));
      close(true);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex items-center w-full"
        style={{
          border: disabled
            ? "1px solid var(--roads-border-subtle)"
            : "1px solid var(--roads-border-dark)",
          backgroundColor: disabled ? "var(--roads-bg-light)" : "var(--roads-bg-primary)",
          borderRadius: "var(--roads-radius-2xs)",
          padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
          height: "44px",
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          disabled={disabled}
          className="label-strong outline-none"
          style={{
            flex: 1,
            color: "var(--roads-text-primary)",
            border: "none",
            background: "transparent",
            cursor: disabled ? "not-allowed" : "text",
            opacity: disabled ? 0.7 : 1,
          }}
          data-testid={testId}
        />
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          disabled={disabled}
          aria-label="Open calendar"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          style={{
            background: "none",
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
          data-testid={testId ? `${testId}-calendar-btn` : undefined}
        >
          <Calendar style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} />
        </button>
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Date picker"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 50,
            marginTop: "var(--roads-spacing-component-2xs)",
            backgroundColor: "var(--roads-bg-primary)",
            border: "1px solid var(--roads-border-subtle)",
            borderRadius: "var(--roads-radius-xs)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            padding: "var(--roads-spacing-component-m)",
          }}
          data-testid={testId ? `${testId}-calendar` : undefined}
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDaySelect}
            disabled={[{ dayOfWeek: [0, 6] }]}
            modifiersClassNames={{
              selected: "roads-day-selected",
              disabled: "roads-day-disabled",
              today: "roads-day-today",
            }}
            classNames={{
              root: "roads-calendar",
              months: "roads-calendar-months",
              month_caption: "roads-calendar-caption",
              nav: "roads-calendar-nav",
              button_previous: "roads-calendar-nav-btn",
              button_next: "roads-calendar-nav-btn",
              weekday: "roads-calendar-weekday",
              day_button: "roads-calendar-day",
              day: "roads-calendar-day-cell",
            }}
          />
        </div>
      )}
    </div>
  );
}
