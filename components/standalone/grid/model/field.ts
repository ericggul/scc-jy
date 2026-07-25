import type { FieldMedia } from "./media";

export type VideoCell = {
  id: string;
  media: FieldMedia;
  playbackRate: number;
  phase: number;
  objectPosition?: string;
};

export type VideoFieldExperiment = {
  slug: string;
  label: string;
  columns: number;
  rows: number;
  gap: number;
  background: string;
  cells: readonly VideoCell[];
};

type CreateCellsOptions = {
  experiment: string;
  count: number;
  media: readonly FieldMedia[];
  rates: readonly number[];
  phaseStep: number;
};

export function createVideoCells({
  experiment,
  count,
  media,
  rates,
  phaseStep,
}: CreateCellsOptions): VideoCell[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${experiment}-cell-${index + 1}`,
    media: media[index % media.length],
    playbackRate: rates[index % rates.length],
    phase: (index * phaseStep + (index % 3) * 0.37) % 1,
    objectPosition: index % 4 === 0 ? "42% 50%" : "50% 50%",
  }));
}
