export const cellularAutomataExperiments = [
  { slug: "1", label: "cellular-automata/1" },
  { slug: "2", label: "cellular-automata/2" },
  { slug: "3", label: "cellular-automata/3" },
  { slug: "4", label: "cellular-automata/4" },
  { slug: "5", label: "cellular-automata/5" },
  { slug: "6", label: "cellular-automata/6" },
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
