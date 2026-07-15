export const bastilleDayExperiments = [
  { slug: "1", label: "bastille-day/1" },
  { slug: "2", label: "bastille-day/2" },
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
