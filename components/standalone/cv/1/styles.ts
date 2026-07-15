import type { CvStyleId } from "./types";

export type CvStyle = {
  id: CvStyleId;
  label: string;
  family: string;
  type: "system" | "serif" | "mono" | "condensed";
  structure:
    | "chronological"
    | "impact"
    | "legal"
    | "academic"
    | "structured"
    | "clinical"
    | "teaching"
    | "technical"
    | "casebook"
    | "architecture"
    | "editorial"
    | "executive"
    | "grant"
    | "federal"
    | "rirekisho"
    | "plain";
  header: "center" | "left" | "rule" | "block" | "letterhead" | "table";
  section: "caps" | "smallcaps" | "numbered" | "plain" | "boxed" | "tabular";
  density: "compact" | "normal" | "expanded";
  pageMode: "one" | "two" | "dossier";
  accent: string;
};

export const cvStyles: readonly CvStyle[] = [
  {
    id: "harvard-compact",
    label: "Harvard compact",
    family: "campus resume",
    type: "serif",
    structure: "chronological",
    header: "center",
    section: "caps",
    density: "compact",
    pageMode: "one",
    accent: "#111111",
  },
  {
    id: "banking-classic",
    label: "Banking classic",
    family: "finance",
    type: "serif",
    structure: "impact",
    header: "center",
    section: "smallcaps",
    density: "compact",
    pageMode: "one",
    accent: "#1d2d44",
  },
  {
    id: "legal-brief",
    label: "Legal brief",
    family: "law",
    type: "serif",
    structure: "legal",
    header: "left",
    section: "plain",
    density: "normal",
    pageMode: "two",
    accent: "#222222",
  },
  {
    id: "consulting-impact",
    label: "Consulting impact",
    family: "strategy",
    type: "system",
    structure: "impact",
    header: "rule",
    section: "caps",
    density: "compact",
    pageMode: "one",
    accent: "#16324f",
  },
  {
    id: "academic-dossier",
    label: "Academic dossier",
    family: "academic",
    type: "serif",
    structure: "academic",
    header: "left",
    section: "plain",
    density: "expanded",
    pageMode: "dossier",
    accent: "#111111",
  },
  {
    id: "lab-cv",
    label: "Lab CV",
    family: "research",
    type: "system",
    structure: "academic",
    header: "left",
    section: "numbered",
    density: "normal",
    pageMode: "dossier",
    accent: "#203a43",
  },
  {
    id: "europass-clean",
    label: "Europass clean",
    family: "european structured",
    type: "system",
    structure: "structured",
    header: "block",
    section: "boxed",
    density: "normal",
    pageMode: "two",
    accent: "#244f9e",
  },
  {
    id: "nhs-clinical",
    label: "Clinical practitioner",
    family: "healthcare",
    type: "system",
    structure: "clinical",
    header: "left",
    section: "tabular",
    density: "normal",
    pageMode: "two",
    accent: "#005eb8",
  },
  {
    id: "teacher-portfolio",
    label: "Teaching portfolio",
    family: "education",
    type: "serif",
    structure: "teaching",
    header: "letterhead",
    section: "plain",
    density: "expanded",
    pageMode: "two",
    accent: "#3b3b3b",
  },
  {
    id: "engineer-spec",
    label: "Engineer spec",
    family: "technical",
    type: "mono",
    structure: "technical",
    header: "rule",
    section: "tabular",
    density: "compact",
    pageMode: "one",
    accent: "#101820",
  },
  {
    id: "product-casebook",
    label: "Product casebook",
    family: "product",
    type: "system",
    structure: "casebook",
    header: "left",
    section: "numbered",
    density: "normal",
    pageMode: "two",
    accent: "#283618",
  },
  {
    id: "design-minimal",
    label: "Design minimal",
    family: "design",
    type: "system",
    structure: "casebook",
    header: "left",
    section: "plain",
    density: "expanded",
    pageMode: "two",
    accent: "#191919",
  },
  {
    id: "architecture-plate",
    label: "Architecture plate",
    family: "architecture",
    type: "condensed",
    structure: "architecture",
    header: "table",
    section: "tabular",
    density: "compact",
    pageMode: "two",
    accent: "#2f2f2f",
  },
  {
    id: "editorial-resume",
    label: "Editorial resume",
    family: "media",
    type: "serif",
    structure: "editorial",
    header: "letterhead",
    section: "smallcaps",
    density: "normal",
    pageMode: "two",
    accent: "#141414",
  },
  {
    id: "executive-board",
    label: "Executive board",
    family: "executive",
    type: "serif",
    structure: "executive",
    header: "block",
    section: "smallcaps",
    density: "expanded",
    pageMode: "two",
    accent: "#0f1f2e",
  },
  {
    id: "nonprofit-grants",
    label: "Nonprofit grants",
    family: "foundation",
    type: "system",
    structure: "grant",
    header: "left",
    section: "plain",
    density: "normal",
    pageMode: "two",
    accent: "#333333",
  },
  {
    id: "government-ksas",
    label: "Government KSA",
    family: "public sector",
    type: "system",
    structure: "federal",
    header: "table",
    section: "boxed",
    density: "expanded",
    pageMode: "two",
    accent: "#1f2933",
  },
  {
    id: "rirekisho-lite",
    label: "Rirekisho lite",
    family: "japanese structured",
    type: "system",
    structure: "rirekisho",
    header: "table",
    section: "tabular",
    density: "normal",
    pageMode: "two",
    accent: "#111111",
  },
  {
    id: "startup-operator",
    label: "Startup operator",
    family: "operator",
    type: "system",
    structure: "impact",
    header: "rule",
    section: "numbered",
    density: "compact",
    pageMode: "one",
    accent: "#202124",
  },
  {
    id: "plain-ats",
    label: "Plain ATS",
    family: "parser-first",
    type: "system",
    structure: "plain",
    header: "center",
    section: "caps",
    density: "normal",
    pageMode: "one",
    accent: "#111111",
  },
] as const;

export function getCvStyle(index: number): CvStyle {
  return cvStyles[index % cvStyles.length] ?? cvStyles[0];
}
