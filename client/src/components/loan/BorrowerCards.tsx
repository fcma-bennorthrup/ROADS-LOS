import { Copy } from "lucide-react";
import type { Borrower } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface BorrowerCardsProps {
  borrowers: Borrower[];
}

function BorrowerCard({ borrower }: { borrower: Borrower }) {
  const { toast } = useToast();

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(borrower.email);
      toast({ title: "Email copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy email", variant: "destructive" });
    }
  };

  return (
    <div
      data-testid={`card-borrower-${borrower.id}`}
      className="flex-1 min-w-0"
      style={{
        border: "1px solid var(--roads-border-subtle)",
        borderRadius: "var(--roads-radius-xs)",
        padding: "var(--roads-spacing-component-l)",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ gap: "var(--roads-spacing-component-xs)" }}
      >
        <span
          data-testid={`text-borrower-name-${borrower.id}`}
          className="headline-300"
          style={{ color: "var(--roads-text-primary)" }}
        >
          {borrower.name}
        </span>
        {borrower.isPrimary && (
          <span
            data-testid={`badge-primary-borrower-${borrower.id}`}
            className="body-200-strong"
            style={{
              backgroundColor: "var(--roads-bg-information-subtle)",
              color: "var(--roads-text-information)",
              padding: "0 var(--roads-spacing-component-xs)",
              borderRadius: "var(--roads-radius-2xs)",
              lineHeight: "20px",
            }}
          >
            Primary Borrower
          </span>
        )}
      </div>

      <div
        style={{ marginTop: "var(--roads-spacing-component-l)" }}
      >
        <div className="flex items-start justify-between">
          <div
            className="flex flex-col"
            style={{ gap: "var(--roads-spacing-component-xs)" }}
          >
            <div
              className="flex items-center"
              style={{ gap: "var(--roads-spacing-component-xs)" }}
            >
              <span
                className="label-strong"
                style={{ color: "var(--roads-text-primary)" }}
              >
                Email
              </span>
              <button
                data-testid={`button-copy-email-${borrower.id}`}
                onClick={handleCopyEmail}
                className="inline-flex items-center"
                style={{ color: "var(--roads-icon-brand)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
              >
                <Copy style={{ width: 12, height: 12 }} />
              </button>
            </div>
            <a
              data-testid={`link-email-${borrower.id}`}
              href={`mailto:${borrower.email}`}
              className="body-100"
              style={{
                color: "var(--roads-text-link)",
                textDecoration: "underline",
              }}
            >
              {borrower.email}
            </a>
          </div>

          <div
            className="flex flex-col"
            style={{ gap: "var(--roads-spacing-component-xs)", width: "104px" }}
          >
            <span
              className="label-strong text-center w-full"
              style={{ color: "var(--roads-text-primary)" }}
            >
              Phone Number
            </span>
            <span
              data-testid={`text-phone-${borrower.id}`}
              className="body-100 w-full"
              style={{ color: "var(--roads-text-primary)" }}
            >
              {borrower.phone}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BorrowerCards({ borrowers }: BorrowerCardsProps) {
  return (
    <section
      data-testid="section-borrower-contacts"
      style={{ padding: `0 var(--roads-spacing-layout-xs)` }}
    >
      <h2
        data-testid="text-borrower-heading"
        className="headline-200"
        style={{
          color: "var(--roads-text-primary)",
          marginBottom: "var(--roads-spacing-component-l)",
        }}
      >
        Borrower Contact Information
      </h2>
      <div
        className="flex"
        style={{ gap: "var(--roads-spacing-component-xl)" }}
      >
        {borrowers.map((borrower) => (
          <BorrowerCard key={borrower.id} borrower={borrower} />
        ))}
      </div>
    </section>
  );
}
