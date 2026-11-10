import { Button } from "@/components/ui/button";

export function CustomerDocumentsContent() {
  return (
    <div
      className="flex flex-col"
      style={{
        padding: "var(--roads-spacing-component-xl)",
        gap: "var(--roads-spacing-component-xl)",
      }}
      data-testid="customer-documents-content"
    >
      <h1 className="headline-200">Customer Documents</h1>
      <section aria-labelledby="minimum-required-documents-heading" className="flex flex-col items-start"
        style={{ gap: "var(--roads-spacing-component-l)" }}>
        <h2 id="minimum-required-documents-heading" className="headline-300">
          Minimum Required Documents
        </h2>
        <Button type="button" variant="secondary" data-testid="button-completed-mindocs">
          Completed MinDocs.
        </Button>
      </section>
    </div>
  );
}
