export type DropOrigin = {
  x: number;
  y: number;
};

export type DropSource = "press" | "trace" | "hold";

export type ActiveBackgroundDrop = {
  accumulationAmount: number;
  id: number;
  origin: DropOrigin;
  previousOrigin: DropOrigin;
  source: DropSource;
  startedAt: number;
  visualStrength: number;
};

export type ActiveDropStream = {
  getDrops: (source: DropSource) => ActiveBackgroundDrop[];
  getVersion: (source: DropSource) => number;
};
