export type GridCell = {
  column: number;
  row: number;
};

export function cycleRowMajorOrder(dimension: number): GridCell[] {
  const size = Math.max(1, Math.floor(dimension));
  return Array.from({ length: size * size }, (_, index) => ({
    column: index % size,
    row: Math.floor(index / size),
  }));
}
