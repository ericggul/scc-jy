export const attractorExperiments = [
  { slug: "1", label: "attractor / 1" },
  { slug: "2", label: "attractor / 2" },
  { slug: "3", label: "attractor / 3" },
] as const;

export type AttractorExperimentSlug =
  (typeof attractorExperiments)[number]["slug"];

export function isAttractorExperimentSlug(
  value: string,
): value is AttractorExperimentSlug {
  return attractorExperiments.some((experiment) => experiment.slug === value);
}
