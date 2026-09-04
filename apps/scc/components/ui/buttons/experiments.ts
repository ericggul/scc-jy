export const buttonExperiments = [
  { slug: "1", label: "ui/buttons/1" },
  { slug: "2", label: "ui/buttons/2" },
  { slug: "3", label: "ui/buttons/3" },
] as const;

export type ButtonExperimentSlug = (typeof buttonExperiments)[number]["slug"];

export function isButtonExperimentSlug(
  value: string,
): value is ButtonExperimentSlug {
  return buttonExperiments.some(({ slug }) => slug === value);
}
