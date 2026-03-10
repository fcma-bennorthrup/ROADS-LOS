import { Copy, Mail, Phone } from "lucide-react";
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
      <div className="flex items-center flex-wrap" style={{ gap: "var(--roads-spacing-component-xs)" }}>
        <span data-testid={`text-borrower-name-${borrower.id}`} className="headline-300" style={{ color: "var(--roads-text-primary)" }}>
          {borrower.name}
        </span>
        {borrower.isPrimary && (
          <span
            data-testid={`badge-primary-borrower-${borrower.id}`}
            className="caption-100-strong"
            style={{
              backgroundColor: "var(--roads-bg-information-subtle)",
              color: "var(--roads-text-information)",
              padding: "var(--roads-spacing-component-2xs) var(--roads-spacing-component-xs)",
              borderRadius: "var(--roads-radius-2xs)",
            }}
          >
            Primary Borrower
          </span>
        )}
      </div>

      <div style={{ marginTop: "var(--roads-spacing-component-l)" }}>
        <div className="flex items-center flex-wrap" style={{ gap: "var(--roads-spacing-component-xs)" }}>
          <Mail style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} />
          <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
            Email
          </span>
          <button
            data-testid={`button-copy-email-${borrower.id}`}
            onClick={handleCopyEmail}
            className="inline-flex items-center"
            style={{ color: "var(--roads-icon-brand)", cursor: "pointer", background: "none", border: "none" }}
          >
            <Copy style={{ width: 14, height: 14 }} />
          </button>
        </div>
        <a
          data-testid={`link-email-${borrower.id}`}
          href={`mailto:${borrower.email}`}
          className="body-100"
          style={{
            color: "var(--roads-text-link)",
            textDecoration: "underline",
            display: "block",
            marginTop: "var(--roads-spacing-component-2xs)",
          }}
        >
          {borrower.email}
        </a>
      </div>

      <div style={{ marginTop: "var(--roads-spacing-component-m)" }}>
        <div className="flex items-center flex-wrap" style={{ gap: "var(--roads-spacing-component-xs)" }}>
          <Phone style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} />
          <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
            Phone Number
          </span>
        </div>
        <span
          data-testid={`text-phone-${borrower.id}`}
          className="body-100"
          style={{
            color: "var(--roads-text-primary)",
            display: "block",
            marginTop: "var(--roads-spacing-component-2xs)",
          }}
        >
          {borrower.phone}
        </span>
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
          marginBottom: "var(--roads-spacing-component-xl)",
        }}
      >
        Borrower Contact Information
      </h2>
      <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-xl)" }}>
        {borrowers.map((borrower) => (
          <BorrowerCard key={borrower.id} borrower={borrower} />
        ))}
      </div>
    </section>
  );
}
