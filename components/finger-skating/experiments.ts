export const fingerSkatingExperiments = [
  { slug: "1", label: "finger-skating/1" },
] as const;

export type FingerSkatingExperimentSlug =
  (typeof fingerSkatingExperiments)[number]["slug"];

export function isFingerSkatingExperimentSlug(
  value: string,
): value is FingerSkatingExperimentSlug {
  return fingerSkatingExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
