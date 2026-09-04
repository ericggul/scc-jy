export const cellularAutomataExperiments = [
  { family: "colour", slug: "1", label: "colour / 1" },
  { family: "colour", slug: "2", label: "colour / 2" },
  { family: "colour", slug: "3", label: "colour / 3" },
  { family: "colour", slug: "4", label: "colour / 4" },
  { family: "colour", slug: "5", label: "colour / 5" },
  { family: "colour", slug: "6", label: "colour / 6" },
  { family: "grid-network", slug: "1", label: "grid network / 1" },
  { family: "grid-network", slug: "2", label: "grid network / 2" },
  { family: "grid-network", slug: "3", label: "grid network / 3" },
] as const;

export type CellularAutomataExperiment =
  (typeof cellularAutomataExperiments)[number];

export type CellularAutomataExperimentFamily =
  CellularAutomataExperiment["family"];

export function getCellularAutomataExperiment(
  family: string,
  slug: string,
) {
  return cellularAutomataExperiments.find(
    (experiment) => experiment.family === family && experiment.slug === slug,
  );
}

export function isColourExperimentSlug(
  value: string,
): value is Extract<CellularAutomataExperiment, { family: "colour" }>["slug"] {
  return cellularAutomataExperiments.some(
    (experiment) => experiment.family === "colour" && experiment.slug === value,
  );
}
