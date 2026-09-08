export const chessExperiments = [
  { slug: "1", label: "chess/1" },
  { slug: "2", label: "chess/2" },
] as const;

export function isChessExperimentSlug(value: string): value is "1" | "2" {
  return chessExperiments.some((experiment) => experiment.slug === value);
}
