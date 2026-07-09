export type CvTwoStyle = {
  id: string;
  label: string;
  archetype: string;
  palette: string;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  type: "serif" | "sans" | "mono" | "condensed";
  header: "folio" | "ledger" | "poster" | "memo" | "index" | "dossier";
  sections: "quiet" | "numbered" | "folio" | "rule" | "label" | "ledger";
  density: "tight" | "measured" | "open";
  pageMode: "one" | "two" | "three";
  emphasis: "work" | "evidence" | "publication" | "portfolio";
};

const archetypes = [
  {
    name: "Diplomatic Serif",
    type: "serif",
    header: "folio",
    sections: "quiet",
    density: "measured",
    pageMode: "two",
    emphasis: "work",
  },
  {
    name: "Swiss Grid",
    type: "sans",
    header: "ledger",
    sections: "rule",
    density: "tight",
    pageMode: "one",
    emphasis: "evidence",
  },
  {
    name: "Museum Monograph",
    type: "serif",
    header: "poster",
    sections: "folio",
    density: "open",
    pageMode: "two",
    emphasis: "portfolio",
  },
  {
    name: "Venture Memo",
    type: "sans",
    header: "memo",
    sections: "numbered",
    density: "tight",
    pageMode: "one",
    emphasis: "evidence",
  },
  {
    name: "Black Editorial",
    type: "serif",
    header: "poster",
    sections: "label",
    density: "open",
    pageMode: "two",
    emphasis: "portfolio",
  },
  {
    name: "Academic Ledger",
    type: "serif",
    header: "dossier",
    sections: "quiet",
    density: "measured",
    pageMode: "three",
    emphasis: "publication",
  },
  {
    name: "Clinical File",
    type: "sans",
    header: "index",
    sections: "ledger",
    density: "measured",
    pageMode: "two",
    emphasis: "work",
  },
  {
    name: "Legal Memorandum",
    type: "serif",
    header: "memo",
    sections: "quiet",
    density: "measured",
    pageMode: "two",
    emphasis: "work",
  },
  {
    name: "Architect Index",
    type: "condensed",
    header: "index",
    sections: "ledger",
    density: "tight",
    pageMode: "two",
    emphasis: "portfolio",
  },
  {
    name: "Product Spec",
    type: "mono",
    header: "ledger",
    sections: "numbered",
    density: "tight",
    pageMode: "one",
    emphasis: "evidence",
  },
  {
    name: "Government Dossier",
    type: "sans",
    header: "dossier",
    sections: "ledger",
    density: "open",
    pageMode: "three",
    emphasis: "work",
  },
  {
    name: "Fashion Minimal",
    type: "sans",
    header: "poster",
    sections: "label",
    density: "open",
    pageMode: "two",
    emphasis: "portfolio",
  },
] as const;

const palettes = [
  {
    name: "White Office",
    paper: "#ffffff",
    ink: "#111111",
    muted: "#545454",
    accent: "#111111",
  },
  {
    name: "Warm Paper",
    paper: "#fffdf7",
    ink: "#17130f",
    muted: "#5e574f",
    accent: "#5b3d2f",
  },
  {
    name: "Legal Blue",
    paper: "#fbfcff",
    ink: "#111827",
    muted: "#4b5563",
    accent: "#1e3a8a",
  },
  {
    name: "Clinical White",
    paper: "#fdffff",
    ink: "#0f172a",
    muted: "#475569",
    accent: "#005eb8",
  },
  {
    name: "Charcoal",
    paper: "#1c1c1c",
    ink: "#f5f1ea",
    muted: "#c8c1b6",
    accent: "#ffffff",
  },
  {
    name: "Obsidian",
    paper: "#050505",
    ink: "#f4f4f4",
    muted: "#b7b7b7",
    accent: "#d8d8d8",
  },
  {
    name: "Oxide",
    paper: "#fffbf8",
    ink: "#1f1410",
    muted: "#6d5750",
    accent: "#8b2f1f",
  },
  {
    name: "Forest",
    paper: "#fbfdf9",
    ink: "#102014",
    muted: "#536255",
    accent: "#244c32",
  },
  {
    name: "Cobalt",
    paper: "#fbfdff",
    ink: "#101828",
    muted: "#475467",
    accent: "#1849a9",
  },
  {
    name: "Stone",
    paper: "#ffffff",
    ink: "#1f1f1f",
    muted: "#646464",
    accent: "#3d3d3d",
  },
] as const;

export const cvTwoStyles: readonly CvTwoStyle[] = archetypes.flatMap(
  (archetype, archetypeIndex) =>
    palettes.map((palette, paletteIndex) => ({
      id: `cv2-${archetype.name.toLowerCase().replaceAll(" ", "-")}-${palette.name
        .toLowerCase()
        .replaceAll(" ", "-")}`,
      label: `${archetype.name} / ${palette.name}`,
      archetype: archetype.name,
      palette: palette.name,
      paper: palette.paper,
      ink: palette.ink,
      muted: palette.muted,
      accent: palette.accent,
      type: archetype.type,
      header: archetype.header,
      sections: archetype.sections,
      density:
        paletteIndex % 3 === 0
          ? archetype.density
          : paletteIndex % 3 === 1
            ? "measured"
            : "open",
      pageMode:
        archetypeIndex % 4 === 0 && paletteIndex % 2 === 0
          ? "three"
          : archetype.pageMode,
      emphasis: archetype.emphasis,
    })),
);

export function getCvTwoStyle(index: number): CvTwoStyle {
  return cvTwoStyles[index % cvTwoStyles.length] ?? cvTwoStyles[0];
}
