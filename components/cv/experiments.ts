export const cvExperiments = [
  { slug: "1", label: "cv/1" },
  { slug: "2", label: "cv/2" },
] as const;

export type CvExperimentSlug = (typeof cvExperiments)[number]["slug"];

export function isCvExperimentSlug(value: string): value is CvExperimentSlug {
  return cvExperiments.some((experiment) => experiment.slug === value);
}
