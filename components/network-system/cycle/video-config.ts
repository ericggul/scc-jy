import type { CycleMediaScreenId } from "@/components/network-system/experiments";

export type CycleVideoSegment = {
  src: string;
  start: number;
  end: number;
};

export const cycleVideoSegments: Record<CycleMediaScreenId, CycleVideoSegment> = {
  left: { src: "/video/left.mp4", start: 5, end: 15 },
  right: { src: "/video/right.mp4", start: 65, end: 74 },
};
