export const bifurcationExperiments = [
  { slug: "1", label: "bifurcation / 1" },
] as const;

export type BifurcationExperimentSlug =
  (typeof bifurcationExperiments)[number]["slug"];

export function isBifurcationExperimentSlug(
  value: string,
): value is BifurcationExperimentSlug {
  return bifurcationExperiments.some((experiment) => experiment.slug === value);
}
