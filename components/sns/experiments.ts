export const snsExperiments = [{ slug: "1", label: "sns/1" }] as const;

export type SnsExperimentSlug = (typeof snsExperiments)[number]["slug"];

export function isSnsExperimentSlug(value: string): value is SnsExperimentSlug {
  return snsExperiments.some((experiment) => experiment.slug === value);
}
