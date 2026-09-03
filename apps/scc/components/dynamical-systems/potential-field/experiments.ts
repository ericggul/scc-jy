export const potentialFieldExperiments = [
  { slug: "1", label: "potential field / 1" },
] as const;

export type PotentialFieldExperimentSlug =
  (typeof potentialFieldExperiments)[number]["slug"];

export function isPotentialFieldExperimentSlug(
  value: string,
): value is PotentialFieldExperimentSlug {
  return potentialFieldExperiments.some((experiment) => experiment.slug === value);
}
