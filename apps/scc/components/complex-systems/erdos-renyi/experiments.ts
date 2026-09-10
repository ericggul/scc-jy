export const erdosRenyiExperiments = [
  { slug: "1", label: "erdos-renyi / 1" },
] as const;

export type ErdosRenyiExperimentSlug =
  (typeof erdosRenyiExperiments)[number]["slug"];

export function isErdosRenyiExperimentSlug(
  value: string,
): value is ErdosRenyiExperimentSlug {
  return erdosRenyiExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
