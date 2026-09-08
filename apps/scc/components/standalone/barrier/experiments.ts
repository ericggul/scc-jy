export const barrierTitle = "장벽을 생각한다면 세라마이드 하나만으로 끝내면 안 됩니다.";
export const barrierExperiments = [
  { slug: "default", label: barrierTitle },
  { slug: "1", label: "grid / N = 5" },
  { slug: "2", label: "grid / N = 10" },
] as const;
export type BarrierExperimentSlug = (typeof barrierExperiments)[number]["slug"];
export function isBarrierExperimentSlug(value: string): value is BarrierExperimentSlug {
  return barrierExperiments.some((experiment) => experiment.slug === value);
}
