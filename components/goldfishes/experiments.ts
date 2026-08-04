import type { ComponentType } from "react";

export type GoldfishExperiment = {
  key: string;
  section: "default" | "2d" | "dated";
  date: string | null;
  phrase: string;
  load: () => Promise<{ default: ComponentType }>;
};

export const goldfishExperiments = [
  {
    key: "default",
    section: "default",
    date: null,
    phrase: "Orthographic 3D goldfish attraction field",
    load: () => import("./default"),
  },
  {
    key: "2d/1",
    section: "2d",
    date: null,
    phrase: "Glyph swarm and media attention cells",
    load: () => import("./2d/1"),
  },
  {
    key: "0804/tube",
    section: "dated",
    date: "2026-08-04",
    phrase: "Tube stations as persistent attraction targets",
    load: () => import("./0804/tube"),
  },
  {
    key: "0804/pillars",
    section: "dated",
    date: "2026-08-04",
    phrase: "Randomized vertical attention pillars",
    load: () => import("./0804/pillars"),
  },
] as const satisfies readonly GoldfishExperiment[];

export function findGoldfishExperiment(path: readonly string[]) {
  const key = path.join("/");
  return goldfishExperiments.find((experiment) => experiment.key === key);
}
