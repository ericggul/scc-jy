export const N = 100;
export const CONCENTRIC_SMILE_COUNT = N;

export const concentricSmileRecords = Array.from(
  { length: CONCENTRIC_SMILE_COUNT },
  (_, rank) => ({
    id: `concentric-smile-${rank}`,
    rank,
  }),
);
