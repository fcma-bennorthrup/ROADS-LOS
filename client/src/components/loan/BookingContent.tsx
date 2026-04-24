import { useState, useEffect, useRef } from "react";

type BookingState = "idle" | "booking" | "booked";

function AnimatedEllipsis() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return <span>{".".repeat(dots)}</span>;
}

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
  const [bookingState, setBookingState] = useState<BookingState>("idle");
  const [bookedAt, setBookedAt] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleBookLoan = () => {
    if (bookingState === "booking") return;
    setBookingState("booking");
    timerRef.current = setTimeout(() => {
      setBookedAt(formatTimestamp());
      setBookingState("booked");
    }, 5000);
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
            aria-disabled={bookingState === "booking"}
            className="label-strong"
            style={{
              backgroundColor: "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              padding:
                "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRadius: "var(--roads-radius-2xs)",
              border: "none",
              cursor: bookingState === "booking" ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
            data-testid="button-book-loan"
          >
            Book Loan
          </button>
        </div>

        {bookingState === "booking" && (
          <p
            className="body-100"
            style={{ color: "var(--roads-text-secondary)" }}
            data-testid="text-booking-status"
          >
            <span>
              Booking Loan<AnimatedEllipsis />
            </span>
          </p>
        )}

        {bookingState === "booked" && bookedAt && (
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
