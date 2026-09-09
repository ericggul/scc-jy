export const chessExperiments = [
  { slug: "1", label: "chess/1" },
  { slug: "2", label: "chess/2" },
  { slug: "3", label: "chess/3" },
] as const;

export function isChessExperimentSlug(value: string): value is "1" | "2" | "3" {
  return chessExperiments.some((experiment) => experiment.slug === value);
}
