export const constellationExperiments = [
  { slug: "1", label: "constellation/1" },
] as const;

export type ConstellationExperimentSlug =
  (typeof constellationExperiments)[number]["slug"];

export function isConstellationExperimentSlug(
  value: string,
): value is ConstellationExperimentSlug {
  return constellationExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
