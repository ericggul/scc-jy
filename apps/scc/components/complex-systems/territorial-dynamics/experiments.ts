export const territorialDynamicsExperiments = [
  { slug: "1", label: "territorial-dynamics/1" },
] as const;

export type TerritorialDynamicsExperimentSlug =
  (typeof territorialDynamicsExperiments)[number]["slug"];

export function isTerritorialDynamicsExperimentSlug(
  value: string,
): value is TerritorialDynamicsExperimentSlug {
  return territorialDynamicsExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
