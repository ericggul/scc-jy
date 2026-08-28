export const clockExperiments = [
  { slug: "1", label: "clock / 1" },
] as const;

export type ClockExperimentSlug =
  (typeof clockExperiments)[number]["slug"];

export function isClockExperimentSlug(
  value: string,
): value is ClockExperimentSlug {
  return clockExperiments.some((experiment) => experiment.slug === value);
}
