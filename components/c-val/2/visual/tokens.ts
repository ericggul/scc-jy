export const cValBloombergPalette = {
  ground: "#030403",
  surface: "#070907",
  surfaceRaised: "#181b18",
  header: "#242722",
  rule: "#353a34",
  ruleStrong: "#565b53",
  text: "#e6e5dd",
  muted: "#90948b",
  dim: "#666b63",
  amber: "#f0a000",
  positive: "#20bd68",
  negative: "#e94a58",
  liquidity: "#45acc7",
} as const;

/**
 * Workstation-only support shades. They build hierarchy and market-side fills;
 * unlike the palette above, they are not portable screen accents.
 */
export const cValBloombergWorkstationChassis = {
  chrome: "#1c1f1b",
  chromeDark: "#111310",
  chromeText: "#a2a59d",
  command: "#090b09",
  control: "#2b2f2a",
  process: "#121411",
  tableHeader: "#171a16",
  insideMarket: "#252923",
  balance: "#0e100e",
  dataRule: "#252924",
  rowRule: "#20241f",
  summaryRule: "#242823",
  verticalRule: "#2a2e29",
  softRule: "#222620",
  track: "#292d28",
  barTrack: "#282c27",
  chartReference: "#60645d",
  chartMuted: "#777c73",
  chartPrimary: "#e8e7df",
  chartSecondary: "#dddcd4",
  textBright: "#f0efe7",
  textStrong: "#f1f0e8",
  textMedium: "#d7d8d0",
  recordText: "#b4b7af",
  tradeText: "#a9aca4",
  bookText: "#d9d9d1",
  onAmber: "#111",
  amberInk: "#15110a",
  white: "#fff",
  disabled: "#6d7169",
  connected: "#a8cdb5",
  marketRow: "#111712",
  positiveWash: "#153820",
  positiveWashRule: "#255332",
  positiveWashText: "#eef4ef",
  positiveDepth: "#0b3921",
  negativeDepth: "#40161c",
} as const;

export const cValBloombergTypography = {
  record: 'var(--font-geist-mono, "SFMono-Regular"), Menlo, Monaco, Consolas, monospace',
  heading: 'var(--font-geist-sans, Inter), "Helvetica Neue", Arial, sans-serif',
  workstationReference: {
    width: 1467,
    height: 750,
    rootSize: 12,
  },
  workstationScale: "max(12px, min(0.818vw, 1.6dvh))",
} as const;

export const cValBloombergScreenProfiles = {
  workstation: {
    job: "compare current conditions, evidence, and outcomes at once",
    wrapper: "shared frame, compact functional panels, and aligned records",
  },
  typographicField: {
    job: "make market movement legible as an information field over time",
    wrapper: "own surface; borrow only semantic hierarchy and bounded motion",
  },
  fullBleedMedia: {
    job: "make market movement visible through image and sound",
    wrapper: "own full-bleed surface; do not add observer chrome",
  },
  physicalInstrument: {
    job: "make execution movement legible as a physical or mechanical event",
    wrapper: "own object scale and material; use market colour only when it carries state",
  },
  feedbackInstrument: {
    job: "close the loop between one physical input and its realized consequence",
    wrapper: "own immediate feedback surface; never become a condensed controller",
  },
} as const;

export type CValBloombergScreenProfile = keyof typeof cValBloombergScreenProfiles;
