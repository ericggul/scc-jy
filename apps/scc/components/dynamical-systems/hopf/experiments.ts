export const hopfExperiments = [
  { slug: "1", label: "Hopf bifurcation / 1" },
] as const;

export type HopfExperimentSlug = (typeof hopfExperiments)[number]["slug"];

export function isHopfExperimentSlug(value: string): value is HopfExperimentSlug {
  return hopfExperiments.some((experiment) => experiment.slug === value);
}
