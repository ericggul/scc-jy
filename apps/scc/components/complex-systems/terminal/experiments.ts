export const terminalExperiments = [
  { slug: "1", label: "terminal/1" },
] as const;

export type TerminalExperimentSlug =
  (typeof terminalExperiments)[number]["slug"];

export function isTerminalExperimentSlug(
  value: string,
): value is TerminalExperimentSlug {
  return terminalExperiments.some((experiment) => experiment.slug === value);
}
