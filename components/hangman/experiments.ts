export const hangmanExperiments = [
  { slug: "1", label: "hangman/1" },
] as const;

export type HangmanExperimentSlug =
  (typeof hangmanExperiments)[number]["slug"];

export function isHangmanExperimentSlug(
  value: string,
): value is HangmanExperimentSlug {
  return hangmanExperiments.some((experiment) => experiment.slug === value);
}
