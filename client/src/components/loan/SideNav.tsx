interface SideNavProps {
  activeItem: string;
  onItemChange: (item: string) => void;
  items?: string[];
}

const ORIGINATION_NAV_ITEMS = [
  "Borrower Information",
  "Loan Details",
  "Collateral",
  "Product & Pricing",
  "Fees",
];

export function SideNav({ activeItem, onItemChange, items }: SideNavProps) {
  const navItems = items || ORIGINATION_NAV_ITEMS;

  return (
    <div
      className="flex flex-col h-full shrink-0"
      style={{
        width: 240,
        backgroundColor: "var(--roads-bg-primary)",
        borderRight: "1px solid var(--roads-border-subtle)",
      }}
      data-testid="side-nav"
    >
      <div
        className="flex flex-col flex-1 overflow-y-auto"
        style={{
          paddingTop: "var(--roads-spacing-component-xl)",
          paddingLeft: "var(--roads-spacing-component-l)",
          paddingRight: "var(--roads-spacing-component-l)",
          gap: "var(--roads-spacing-component-xs)",
        }}
      >
        {navItems.map((item) => {
          const isActive = item === activeItem;
          return (
            <button
              key={item}
              onClick={() => onItemChange(item)}
              className="flex items-center w-full text-left"
              style={{
                padding: "var(--roads-spacing-component-2xs) var(--roads-spacing-component-xs)",
                gap: "var(--roads-spacing-component-m)",
                borderRadius: "var(--roads-radius-2xs)",
                fontFamily: "var(--roads-font-family)",
                fontSize: "16px",
                lineHeight: "24px",
                fontWeight: isActive ? 600 : 400,
                color: "var(--roads-text-primary)",
              }}
              data-testid={`nav-item-${item.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
