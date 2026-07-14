import type { CycleSnapshot } from "@/components/network-system/cycle/model";

export type CycleVideoCounts = {
  growth: number;
  leftCount: number;
  rightCount: number;
};

export type CycleVideoLayout = CycleVideoCounts & {
  leftDimension: number;
  rightDimension: number;
};

export function cycleVideoCountsFromGrowth(growth: number): CycleVideoCounts {
  const safeGrowth = Number.isFinite(growth) ? growth : 0;
  if (safeGrowth > 0) {
    return {
      growth: safeGrowth,
      leftCount: Math.ceil(Math.abs(safeGrowth)),
      rightCount: 0,
    };
  }
  if (safeGrowth < 0) {
    return {
      growth: safeGrowth,
      leftCount: 0,
      rightCount: Math.ceil(Math.abs(safeGrowth)),
    };
  }
  return { growth: 0, leftCount: 0, rightCount: 0 };
}

export function cycleDimensionFromCount(count: number) {
  return Math.max(1, Math.ceil(Math.sqrt(Math.max(0, count))));
}

export function presentCycleVideoLayout(snapshot: CycleSnapshot): CycleVideoLayout {
  const counts = cycleVideoCountsFromGrowth(snapshot.gdpGrowth);

  return {
    ...counts,
    leftDimension: cycleDimensionFromCount(counts.leftCount),
    rightDimension: cycleDimensionFromCount(counts.rightCount),
  };
}
