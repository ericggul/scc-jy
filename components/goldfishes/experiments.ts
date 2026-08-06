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
    key: "0804/html",
    section: "dated",
    date: "2026-08-04",
    phrase: "Live HTML forms as bidirectional attraction targets",
    load: () => import("./0804/html"),
  },
  {
    key: "0804/node-edge",
    section: "dated",
    date: "2026-08-04",
    phrase: "Entropy-generated 3D topology as a persistent attraction field",
    load: () => import("./0804/node-edge"),
  },
  {
    key: "0804/pillars",
    section: "dated",
    date: "2026-08-04",
    phrase: "Randomized vertical attention pillars",
    load: () => import("./0804/pillars"),
  },
  {
    key: "0806/side-view",
    section: "dated",
    date: "2026-08-06",
    phrase: "Pillars fork with a side-on initial view",
    load: () => import("./0806/side-view"),
  },
  {
    key: "0806/compositional-grid",
    section: "dated",
    date: "2026-08-06",
    phrase: "Locally reconfiguring composite media grid",
    load: () => import("./0806/compositional-grid"),
  },
] as const satisfies readonly GoldfishExperiment[];

export const goldfishExperimentDateKeys = Array.from(
  new Set(
    goldfishExperiments
      .filter((experiment) => experiment.section === "dated")
      .map((experiment) => experiment.key.split("/")[0]),
  ),
);

export function findGoldfishExperiment(path: readonly string[]) {
  const key = path.join("/");
  return goldfishExperiments.find((experiment) => experiment.key === key);
}

export function getGoldfishExperimentsForDate(dateKey: string) {
  return goldfishExperiments.filter(
    (experiment) =>
      experiment.section === "dated" &&
      experiment.key.startsWith(`${dateKey}/`),
  );
}
