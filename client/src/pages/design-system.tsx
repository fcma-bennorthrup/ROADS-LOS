import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { colors, typography, spacing, radius } from "@/lib/design-tokens";

const colorSections = [
  {
    title: "Text Colors",
    tokens: [
      { name: "text-primary", value: colors.text.primary, cssVar: "--roads-text-primary" },
      { name: "text-secondary", value: colors.text.secondary, cssVar: "--roads-text-secondary" },
      { name: "text-brand", value: colors.text.brand, cssVar: "--roads-text-brand" },
      { name: "text-link", value: colors.text.link, cssVar: "--roads-text-link" },
      { name: "text-reverse", value: colors.text.reverse, cssVar: "--roads-text-reverse" },
      { name: "text-error", value: colors.text.error, cssVar: "--roads-text-error" },
      { name: "text-warning", value: colors.text.warning, cssVar: "--roads-text-warning" },
      { name: "text-information", value: colors.text.information, cssVar: "--roads-text-information" },
    ],
  },
  {
    title: "Background Colors",
    tokens: [
      { name: "background-page", value: colors.background.page, cssVar: "--roads-bg-page" },
      { name: "background-primary", value: colors.background.primary, cssVar: "--roads-bg-primary" },
      { name: "background-dark", value: colors.background.dark, cssVar: "--roads-bg-dark" },
      { name: "background-brand", value: colors.background.brand, cssVar: "--roads-bg-brand" },
      { name: "background-brand-subtle", value: colors.background.brandSubtle, cssVar: "--roads-bg-brand-subtle" },
      { name: "background-error", value: colors.background.error, cssVar: "--roads-bg-error" },
      { name: "background-error-subtle", value: colors.background.errorSubtle, cssVar: "--roads-bg-error-subtle" },
      { name: "background-warning-subtle", value: colors.background.warningSubtle, cssVar: "--roads-bg-warning-subtle" },
      { name: "background-information-subtle", value: colors.background.informationSubtle, cssVar: "--roads-bg-information-subtle" },
    ],
  },
  {
    title: "Icon Colors",
    tokens: [
      { name: "icon-dark", value: colors.icon.dark, cssVar: "--roads-icon-dark" },
      { name: "icon-brand", value: colors.icon.brand, cssVar: "--roads-icon-brand" },
    ],
  },
  {
    title: "Border Colors",
    tokens: [
      { name: "border-subtle", value: colors.border.subtle, cssVar: "--roads-border-subtle" },
      { name: "border-brand", value: colors.border.brand, cssVar: "--roads-border-brand" },
      { name: "border-reverse", value: colors.border.reverse, cssVar: "--roads-border-reverse" },
    ],
  },
];

const typographyEntries = Object.entries(typography) as [
  keyof typeof typography,
  (typeof typography)[keyof typeof typography],
][];

const spacingEntries = Object.entries(spacing) as [string, string][];

const radiusEntries = Object.entries(radius) as [string, string][];

function ColorSwatch({ name, value, cssVar }: { name: string; value: string; cssVar: string }) {
  const needsBorder = value === "#ffffff";
  return (
    <div className="flex items-center gap-3" data-testid={`color-swatch-${name}`}>
      <div
        className="w-12 h-12 rounded-md flex-shrink-0"
        style={{
          backgroundColor: value,
          border: needsBorder ? "1px solid #dee1e1" : "none",
        }}
      />
      <div className="min-w-0">
        <p className="body-200-strong">{name}</p>
        <p className="caption-100 text-muted-foreground">{value}</p>
        <p className="caption-100 text-muted-foreground">{cssVar}</p>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-8 space-y-12">
        <header>
          <h1 className="headline-100" data-testid="text-page-title">ROADS LOS Design System</h1>
          <p className="body-100 text-muted-foreground mt-2" data-testid="text-page-description">
            Design tokens and component library for the Loan Origination System
          </p>
        </header>

        <section data-testid="section-colors">
          <h2 className="headline-200 mb-6">Color Palette</h2>
          <div className="space-y-8">
            {colorSections.map((section) => (
              <Card key={section.title}>
                <CardHeader>
                  <CardTitle className="headline-300">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {section.tokens.map((token) => (
                      <ColorSwatch key={token.name} {...token} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section data-testid="section-typography">
          <h2 className="headline-200 mb-6">Typography Scale</h2>
          <Card>
            <CardContent className="pt-6 space-y-6">
              {typographyEntries.map(([name, spec]) => (
                <div
                  key={name}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 pb-4 border-b last:border-b-0 last:pb-0"
                  data-testid={`typography-${name}`}
                >
                  <div className="sm:w-48 flex-shrink-0">
                    <p className="caption-100-strong text-muted-foreground uppercase tracking-wide">{name}</p>
                    <p className="caption-100 text-muted-foreground">
                      {spec.size} / {spec.lineHeight} / {spec.weight}
                    </p>
                  </div>
                  <p className={name}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section data-testid="section-spacing">
          <h2 className="headline-200 mb-6">Spacing Scale</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              {spacingEntries.map(([name, value]) => (
                <div
                  key={name}
                  className="flex items-center gap-4"
                  data-testid={`spacing-${name}`}
                >
                  <span className="w-40 caption-100-strong text-muted-foreground">{name}</span>
                  <span className="w-16 caption-100 text-muted-foreground">{value}</span>
                  <div
                    className="h-4 bg-primary rounded-sm"
                    style={{ width: value }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section data-testid="section-radius">
          <h2 className="headline-200 mb-6">Border Radius</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-8 items-end">
                {radiusEntries.map(([name, value]) => (
                  <div key={name} className="flex flex-col items-center gap-2" data-testid={`radius-${name}`}>
                    <div
                      className="w-20 h-20 bg-primary"
                      style={{ borderRadius: value }}
                    />
                    <span className="caption-100-strong">{name}</span>
                    <span className="caption-100 text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section data-testid="section-components">
          <h2 className="headline-200 mb-6">Components</h2>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="headline-300">Buttons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-center">
                  <Button data-testid="button-default">Default</Button>
                  <Button variant="secondary" data-testid="button-secondary">Secondary</Button>
                  <Button variant="outline" data-testid="button-outline">Outline</Button>
                  <Button variant="ghost" data-testid="button-ghost">Ghost</Button>
                  <Button variant="destructive" data-testid="button-destructive">Destructive</Button>
                </div>
                <div className="flex flex-wrap gap-4 items-center mt-6">
                  <Button size="sm" data-testid="button-small">Small</Button>
                  <Button size="default" data-testid="button-medium">Default</Button>
                  <Button size="lg" data-testid="button-large">Large</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="headline-300">Form Elements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="example-input" data-testid="label-example">Label Strong</Label>
                  <Input
                    id="example-input"
                    placeholder="Enter text..."
                    data-testid="input-example"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disabled-input" data-testid="label-disabled">Disabled Input</Label>
                  <Input
                    id="disabled-input"
                    placeholder="Disabled..."
                    disabled
                    data-testid="input-disabled"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="headline-300">Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 items-center">
                  <Badge data-testid="badge-default">Default</Badge>
                  <Badge variant="secondary" data-testid="badge-secondary">Secondary</Badge>
                  <Badge variant="outline" data-testid="badge-outline">Outline</Badge>
                  <Badge variant="destructive" data-testid="badge-destructive">Destructive</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="headline-300">Cards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Loan Application</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="body-100 text-muted-foreground" data-testid="text-card-example">
                        Example card using the ROADS design tokens with proper spacing and typography.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Document Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="body-100 text-muted-foreground">
                        Another card demonstrating consistent styling across the system.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section data-testid="section-semantic-mapping">
          <h2 className="headline-200 mb-6">Semantic Color Mapping</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-md bg-primary text-primary-foreground" data-testid="swatch-primary">
                  <p className="body-200-strong">Primary (Brand)</p>
                  <p className="caption-100">#005b94</p>
                </div>
                <div className="p-4 rounded-md bg-secondary text-secondary-foreground" data-testid="swatch-secondary">
                  <p className="body-200-strong">Secondary</p>
                  <p className="caption-100">#e5eff4</p>
                </div>
                <div className="p-4 rounded-md bg-muted text-foreground" data-testid="swatch-muted">
                  <p className="body-200-strong">Muted</p>
                  <p className="caption-100">#dee1e1</p>
                </div>
                <div className="p-4 rounded-md bg-destructive text-destructive-foreground" data-testid="swatch-destructive">
                  <p className="body-200-strong">Destructive (Error)</p>
                  <p className="caption-100">#c63434</p>
                </div>
                <div className="p-4 rounded-md bg-warning text-foreground" data-testid="swatch-warning">
                  <p className="body-200-strong">Warning</p>
                  <p className="caption-100">#dd9903</p>
                </div>
                <div className="p-4 rounded-md bg-info text-white" data-testid="swatch-info">
                  <p className="body-200-strong">Information</p>
                  <p className="caption-100">#2079c3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
