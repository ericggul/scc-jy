export const bastilleDayExperiments = [
  { slug: "1", label: "bastille-day/1" },
] as const;

export type BastilleDayExperimentSlug =
  (typeof bastilleDayExperiments)[number]["slug"];

export function isBastilleDayExperimentSlug(
  value: string,
): value is BastilleDayExperimentSlug {
  return bastilleDayExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
