export const artificialLanguageExperiments = [
  { slug: "1", label: "artificial-language/1" },
] as const;

export type ArtificialLanguageExperimentSlug =
  (typeof artificialLanguageExperiments)[number]["slug"];

export function isArtificialLanguageExperimentSlug(
  value: string,
): value is ArtificialLanguageExperimentSlug {
  return artificialLanguageExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
