export type DropOrigin = {
  x: number;
  y: number;
};

export type DropSource = "press" | "trace";

export type ActiveBackgroundDrop = {
  accumulationAmount: number;
  id: number;
  origin: DropOrigin;
  previousOrigin: DropOrigin;
  source: DropSource;
  startedAt: number;
  visualStrength: number;
};
