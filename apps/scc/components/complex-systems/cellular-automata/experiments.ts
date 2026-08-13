export const cellularAutomataExperiments = [
  { slug: "1", label: "cellular-automata/1" },
] as const;

export type CellularAutomataExperimentSlug =
  (typeof cellularAutomataExperiments)[number]["slug"];

export function isCellularAutomataExperimentSlug(
  value: string,
): value is CellularAutomataExperimentSlug {
  return cellularAutomataExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
