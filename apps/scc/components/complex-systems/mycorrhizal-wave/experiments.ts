export const mycorrhizalWaveExperiments = [
  { slug: "1", label: "mycorrhizal-wave/1 — plate 94" },
  { slug: "2", label: "mycorrhizal-wave/2 — mechanistic wave simulation" },
] as const;

export type MycorrhizalWaveExperimentSlug =
  (typeof mycorrhizalWaveExperiments)[number]["slug"];

export function isMycorrhizalWaveExperimentSlug(
  value: string,
): value is MycorrhizalWaveExperimentSlug {
  return mycorrhizalWaveExperiments.some(({ slug }) => slug === value);
}
