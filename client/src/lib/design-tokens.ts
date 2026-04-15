export const colors = {
  text: {
    primary: "#273333",
    secondary: "#515e5f",
    tertiary: "#929a9b",
    brand: "#005b94",
    link: "#005b94",
    reverse: "#ffffff",
    error: "#c63434",
    warning: "#dd9903",
    information: "#2079c3",
  },
  background: {
    page: "#ffffff",
    primary: "#ffffff",
    dark: "#dee1e1",
    brand: "#005b94",
    brandSubtle: "#e5eff4",
    error: "#c63434",
    errorSubtle: "#ffd5d2",
    warningSubtle: "#fdefcd",
    informationSubtle: "#dcf2ff",
    light: "#f9f9f9",
    action: "#005b94",
    errorDisabled: "#ff9c8f",
    discoverySubtle: "#eaeaf9",
  },
  icon: {
    dark: "#273333",
    brand: "#005b94",
  },
  border: {
    subtle: "#dee1e1",
    dark: "#929a9b",
    brand: "#005b94",
    reverse: "#ffffff",
  },
} as const;

export const typography = {
  "headline-100": {
    size: "32px",
    weight: 600,
    lineHeight: "40px",
  },
  "headline-200": {
    size: "24px",
    weight: 600,
    lineHeight: "32px",
  },
  "headline-300": {
    size: "20px",
    weight: 600,
    lineHeight: "24px",
  },
  "body-100": {
    size: "16px",
    weight: 400,
    lineHeight: "16px",
  },
  "body-200-strong": {
    size: "14px",
    weight: 600,
    lineHeight: "20px",
  },
  "caption-100": {
    size: "12px",
    weight: 400,
    lineHeight: "16px",
  },
  "caption-100-strong": {
    size: "12px",
    weight: 600,
    lineHeight: "16px",
  },
  "label-strong": {
    size: "16px",
    weight: 600,
    lineHeight: "16px",
  },
} as const;

export const spacing = {
  "component-3xs": "2px",
  "component-2xs": "4px",
  "component-xs": "8px",
  "component-m": "12px",
  "component-l": "16px",
  "component-s": "10px",
  "component-xl": "24px",
  "component-2xl": "32px",
  "component-3xl": "40px",
  "layout-xs": "48px",
} as const;

export const radius = {
  "2xs": "4px",
  xs: "8px",
  round: "9999px",
} as const;

export const fontFamily = "'Source Sans Pro', sans-serif";

export const designTokens = {
  colors,
  typography,
  spacing,
  radius,
  fontFamily,
} as const;

export default designTokens;
