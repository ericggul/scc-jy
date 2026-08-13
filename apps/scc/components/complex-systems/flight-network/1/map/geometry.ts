export type MapPoint = { x: number; y: number };

export const syntheticLandmasses: readonly (readonly MapPoint[])[] = [
  [
    { x: 0.03, y: 0.17 }, { x: 0.14, y: 0.1 }, { x: 0.25, y: 0.15 },
    { x: 0.31, y: 0.27 }, { x: 0.27, y: 0.41 }, { x: 0.2, y: 0.53 },
    { x: 0.12, y: 0.49 }, { x: 0.07, y: 0.35 },
  ],
  [
    { x: 0.24, y: 0.56 }, { x: 0.34, y: 0.51 }, { x: 0.39, y: 0.63 },
    { x: 0.35, y: 0.83 }, { x: 0.27, y: 0.9 }, { x: 0.2, y: 0.76 },
  ],
  [
    { x: 0.4, y: 0.15 }, { x: 0.51, y: 0.1 }, { x: 0.61, y: 0.2 },
    { x: 0.6, y: 0.34 }, { x: 0.54, y: 0.43 }, { x: 0.44, y: 0.39 },
    { x: 0.38, y: 0.27 },
  ],
  [
    { x: 0.45, y: 0.4 }, { x: 0.57, y: 0.38 }, { x: 0.64, y: 0.5 },
    { x: 0.61, y: 0.72 }, { x: 0.52, y: 0.86 }, { x: 0.44, y: 0.72 },
    { x: 0.4, y: 0.55 },
  ],
  [
    { x: 0.61, y: 0.14 }, { x: 0.75, y: 0.1 }, { x: 0.91, y: 0.19 },
    { x: 0.97, y: 0.35 }, { x: 0.91, y: 0.49 }, { x: 0.78, y: 0.52 },
    { x: 0.68, y: 0.43 }, { x: 0.6, y: 0.3 },
  ],
  [
    { x: 0.75, y: 0.57 }, { x: 0.88, y: 0.54 }, { x: 0.96, y: 0.66 },
    { x: 0.91, y: 0.82 }, { x: 0.79, y: 0.86 }, { x: 0.71, y: 0.73 },
  ],
  [
    { x: 0.1, y: 0.66 }, { x: 0.16, y: 0.63 }, { x: 0.18, y: 0.72 },
    { x: 0.12, y: 0.77 }, { x: 0.07, y: 0.72 },
  ],
];

export function projectedPoint(point: MapPoint, width: number, height: number) {
  return { x: point.x * width, y: point.y * height };
}

export function wrappedTarget(source: MapPoint, target: MapPoint): MapPoint {
  const difference = target.x - source.x;
  if (difference > 0.5) return { ...target, x: target.x - 1 };
  if (difference < -0.5) return { ...target, x: target.x + 1 };
  return target;
}

export function curvedRoutePoint(
  source: MapPoint,
  targetInput: MapPoint,
  progress: number,
  bendDirection: number,
) {
  const target = wrappedTarget(source, targetInput);
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(0.001, Math.hypot(dx, dy));
  const bend = Math.min(0.075, length * 0.13) * bendDirection;
  const control = {
    x: (source.x + target.x) * 0.5 - (dy / length) * bend,
    y: (source.y + target.y) * 0.5 + (dx / length) * bend,
  };
  const inverse = 1 - progress;
  const point = {
    x: inverse * inverse * source.x + 2 * inverse * progress * control.x + progress * progress * target.x,
    y: inverse * inverse * source.y + 2 * inverse * progress * control.y + progress * progress * target.y,
  };
  const tangent = {
    x: 2 * inverse * (control.x - source.x) + 2 * progress * (target.x - control.x),
    y: 2 * inverse * (control.y - source.y) + 2 * progress * (target.y - control.y),
  };
  return { point, angle: Math.atan2(tangent.y, tangent.x) };
}
