---
  name: figma-design-system-compliance
  description: Enforces strict adherence to Figma-extracted design tokens. Use whenever implementing UI, styling components, or making visual changes. Prevents creating custom styles outside the approved design system.
  ---

  # Figma Design System Compliance

  ## Core Rule

  **NEVER create, invent, or use any styles, colors, spacing, typography, or design values that are not:**
  1. Already defined in `client/src/styles/design-tokens.css`, OR
  2. Extracted from the Figma file using the Figma MCP server

  ## Approval Process for New Design Tokens

  If you encounter a new design token in Figma that is NOT in the current design-tokens.css:

  1. **Extract the token** using the Figma MCP server
  2. **Present to the user** with:
     - Token name
     - Token value
     - Where it would be used
     - How it differs from existing tokens
  3. **Wait for explicit approval** before adding to design-tokens.css
  4. **Never assume approval** - the user must explicitly say "yes" or "approve"

  ## Approved Design Token Sources

  ### Current Design Token Files
  - `client/src/styles/design-tokens.css` - CSS custom properties (--roads-*)
  - `client/src/lib/design-tokens.ts` - TypeScript exports
  - `tailwind.config.ts` - Tailwind theme configuration

  ### Figma Source
  - **File**: ROADS-Designs (4b8PadIK9cXCCKmlggWGOL)
  - **URL**: https://www.figma.com/design/4b8PadIK9cXCCKmlggWGOL/ROADS-Designs
  - **Node ID**: 1605-33389

  ### Variable Mode
  The Figma design token sheet contains multiple variable modes. **Only use the "Rural First" variable mode.** All other variable modes must be ignored when extracting tokens. If a token value differs between modes, always use the Rural First value. Do not apply tokens from any other mode without explicit user approval.

  ## What You CANNOT Do

  ❌ **FORBIDDEN - These will upset the user:**
  - Using arbitrary color values (e.g., `#123456`, `rgb(10,20,30)`)
  - Using arbitrary spacing (e.g., `margin: 15px`, `padding: 7px`)
  - Using custom font sizes not in the design system
  - Creating new CSS classes with hardcoded values
  - Using Tailwind arbitrary values (e.g., `w-[347px]`, `text-[18px]`)
  - Inventing new design tokens without approval
  - Using generic Tailwind colors (e.g., `bg-blue-500`, `text-red-600`)

  ## What You MUST Do

  ✅ **REQUIRED - Always do this:**
  - Use CSS custom properties: `var(--roads-color-text-primary)`
  - Use Tailwind semantic classes: `text-brand`, `bg-brand-subtle`
  - Use design token utility classes: `headline-100`, `body-200-strong`
  - Use approved spacing tokens: `roads-spacing-component-xs`
  - Use approved radius tokens: `roads-radius-xs`
  - Check design-tokens.css FIRST before styling anything
  - Extract from Figma if you need a new value

  ## Current Approved Design Tokens (as of extraction)

  ### Colors (22 tokens)
  - Text: primary, secondary, brand, link, reverse, error, warning, information
  - Background: page, primary, dark, brand, brand-subtle, error, error-subtle, warning-subtle, information-subtle
  - Icon: dark, brand
  - Border: subtle, brand, reverse

  ### Typography (8 tokens)
  - Headlines: headline-100 (32px), headline-200 (24px), headline-300 (20px)
  - Body: body-100 (16px), body-200-strong (14px)
  - Captions: caption-100 (12px), caption-100-strong (12px)
  - Labels: label-strong (16px)
  - Font Family: Source Sans Pro

  ### Spacing (7 tokens)
  - Component: 3xs (2px), 2xs (4px), xs (8px), m (12px), l (16px), xl (24px)
  - Layout: xs (48px)

  ### Radius (3 tokens)
  - 2xs (4px), xs (8px), round (9999px)

  ## Example: Correct Usage

  ```tsx
  // ✅ CORRECT - Using design tokens
  <div className="bg-brand text-reverse p-roads-spacing-component-l rounded-roads-radius-xs">
    <h1 className="headline-100">Loan Dashboard</h1>
    <p className="body-100 text-secondary">Welcome back</p>
  </div>

  // ✅ CORRECT - Using CSS custom properties
  <div style={{ 
    backgroundColor: 'var(--roads-color-background-brand)',
    color: 'var(--roads-color-text-reverse)',
    padding: 'var(--roads-spacing-component-l)'
  }}>
    Content
  </div>
  ```

  ## Example: Incorrect Usage

  ```tsx
  // ❌ WRONG - Arbitrary colors
  <div className="bg-blue-600 text-white">

  // ❌ WRONG - Arbitrary spacing
  <div className="p-[18px] m-[33px]">

  // ❌ WRONG - Custom font size
  <h1 className="text-[28px]">

  // ❌ WRONG - Hardcoded values
  <div style={{ color: '#005b94', padding: '20px' }}>
  ```

  ## When User Shares New Figma Designs

  1. Extract variables using: `mcpFigma_getVariableDefs({ fileKey, nodeId })`
  2. Compare with existing design-tokens.css
  3. If new tokens found:
     - List all new tokens clearly
     - Explain what's new and why it's needed
     - Ask: "I found X new design tokens in Figma. Would you like me to add them to the design system?"
  4. Only proceed after explicit approval

  ## Enforcement

  - Before writing ANY styling code, verify the token exists
  - If unsure, check design-tokens.css or design-tokens.ts
  - When reviewing code, flag any non-token styles
  - Treat this rule with the same severity as security vulnerabilities

  ## Why This Matters

  - **Consistency**: Design system stays true to Figma source of truth
  - **Maintainability**: Changes in one place (Figma) propagate correctly
  - **Collaboration**: Designers control the design, developers implement exactly
  - **Quality**: No visual drift or ad-hoc styling decisions
  