export function StockContent() {
  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-3xl)",
        gap: "var(--roads-spacing-component-xl)",
      }}
      data-testid="stock-content"
    >
      <h2 className="headline-200" style={{ color: "var(--roads-text-primary)" }}>
        Stock
      </h2>
    </div>
  );
}
