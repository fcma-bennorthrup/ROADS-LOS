import { useState } from "react";

function formatTimestamp(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const year = now.getFullYear();
  let hours = now.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${month}/${day}/${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

export function BookingContent() {
  const [bookedAt, setBookedAt] = useState<string | null>(null);

  const handleBookLoan = () => {
    setBookedAt(formatTimestamp());
  };

  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-3xl)",
        gap: "var(--roads-spacing-component-xl)",
      }}
      data-testid="booking-content"
    >
      <h2
        className="headline-200"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="text-booking-title"
      >
        Booking
      </h2>

      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
        <div className="flex items-center">
          <button
            onClick={handleBookLoan}
            className="label-strong"
            style={{
              backgroundColor: "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              padding:
                "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRadius: "var(--roads-radius-2xs)",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            data-testid="button-book-loan"
          >
            Book Loan
          </button>
        </div>

        {bookedAt && (
          <p
            className="body-100"
            style={{ color: "var(--roads-text-secondary)" }}
            data-testid="text-booking-confirmation"
          >
            {`Loan successfully booked: ${bookedAt}`}
          </p>
        )}
      </div>
    </div>
  );
}
