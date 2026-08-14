export const temporalNetworkExperiments = [
  { slug: "repair-relay", label: "temporal repair relay" },
] as const;

export type TemporalNetworkExperimentSlug =
  (typeof temporalNetworkExperiments)[number]["slug"];

export function isTemporalNetworkExperimentSlug(
  value: string,
): value is TemporalNetworkExperimentSlug {
  return temporalNetworkExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
