export const hypertextNetworkExperiments = [
  { slug: "1", label: "hypertext-network/1" },
] as const;

export type HypertextNetworkExperimentSlug =
  (typeof hypertextNetworkExperiments)[number]["slug"];

export function isHypertextNetworkExperimentSlug(
  value: string,
): value is HypertextNetworkExperimentSlug {
  return hypertextNetworkExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
