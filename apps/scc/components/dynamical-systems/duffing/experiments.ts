export const duffingExperiments = [
  { slug: "1", label: "duffing / 1" },
] as const;

export type DuffingExperimentSlug =
  (typeof duffingExperiments)[number]["slug"];

export function isDuffingExperimentSlug(
  value: string,
): value is DuffingExperimentSlug {
  return duffingExperiments.some((experiment) => experiment.slug === value);
}
