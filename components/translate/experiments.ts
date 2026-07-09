export const translateExperiments = [
  { slug: "1", label: "translate/1" },
  { slug: "2", label: "translate/2" },
  { slug: "3", label: "translate/3" },
] as const;

export type TranslateExperimentSlug =
  (typeof translateExperiments)[number]["slug"];

export function isTranslateExperimentSlug(
  value: string,
): value is TranslateExperimentSlug {
  return translateExperiments.some((experiment) => experiment.slug === value);
}
