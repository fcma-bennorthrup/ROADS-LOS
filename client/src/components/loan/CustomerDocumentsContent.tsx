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
        <button
          type="button"
          className="body-200-strong whitespace-nowrap"
          style={{
            backgroundColor: "var(--roads-bg-primary)",
            border: "1px solid var(--roads-border-dark)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
            color: "var(--roads-text-primary)",
            cursor: "pointer",
          }}
          data-testid="button-completed-mindocs"
        >
          Completed MinDocs
        </button>
      </section>
    </div>
  );
}
