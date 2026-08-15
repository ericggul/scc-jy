import type { ComponentType } from "react";

export type ParametricInterfaceExperiment = {
  key: string;
  section: "default" | "dated";
  date: string | null;
  phrase: string;
  load: () => Promise<{ default: ComponentType }>;
};

export const parametricInterfaceExperiments: readonly ParametricInterfaceExperiment[] = [
  {
    key: "whole",
    section: "default",
    date: null,
    phrase: "One continuous lyric moving through randomly selected wrappers",
    load: () => import("./whole"),
  },
  {
    key: "1",
    section: "default",
    date: null,
    phrase: "Binary response field",
    load: () => import("./1"),
  },
  {
    key: "2",
    section: "default",
    date: null,
    phrase: "Lyric words held in individual spreadsheet centre-row cells",
    load: () => import("./2"),
  },
  {
    key: "3",
    section: "default",
    date: null,
    phrase: "macOS menu-bar field with a central lyric",
    load: () => import("./3"),
  },
  {
    key: "4",
    section: "default",
    date: null,
    phrase: "Fixed high-density departure FIDS with lyric destinations",
    load: () => import("./4"),
  },
  {
    key: "5",
    section: "default",
    date: null,
    phrase: "Gmail inbox where starred mail accumulates and lyric messages arrive in the stream",
    load: () => import("./5"),
  },
  {
    key: "6",
    section: "default",
    date: null,
    phrase: "zsh terminal line with lyric developed inside a printf argument",
    load: () => import("./6"),
  },
];

export const parametricInterfaceIndexEntries = [
  { slug: "whole", label: "parametric-interface/whole" },
  { slug: "1", label: "parametric-interface/1" },
  { slug: "2", label: "parametric-interface/2" },
  { slug: "3", label: "parametric-interface/3" },
  { slug: "4", label: "parametric-interface/4" },
  { slug: "5", label: "parametric-interface/5" },
  { slug: "6", label: "parametric-interface/6" },
] as const;

export type ParametricInterfaceExperimentSlug =
  (typeof parametricInterfaceIndexEntries)[number]["slug"];

export const parametricInterfaceExperimentDateKeys = Array.from(
  new Set(
    parametricInterfaceExperiments
      .filter((experiment) => experiment.section === "dated")
      .map((experiment) => experiment.key.split("/")[0]),
  ),
);

export function findParametricInterfaceExperiment(path: readonly string[]) {
  const key = path.join("/");
  return parametricInterfaceExperiments.find((experiment) => experiment.key === key);
}

export function getParametricInterfaceExperimentsForDate(dateKey: string) {
  return parametricInterfaceExperiments.filter(
    (experiment) =>
      experiment.section === "dated" &&
      experiment.key.startsWith(`${dateKey}/`),
  );
}
