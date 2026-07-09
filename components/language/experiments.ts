export const languageExperiments = [{ slug: "1", label: "language/1" }] as const;

export type LanguageExperimentSlug = (typeof languageExperiments)[number]["slug"];

export function isLanguageExperimentSlug(
  value: string,
): value is LanguageExperimentSlug {
  return languageExperiments.some((experiment) => experiment.slug === value);
}
