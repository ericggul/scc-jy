import type { ErdosRenyiGraph } from "../model";

export type ErdosRenyiLayoutPoint = {
  readonly x: number;
  readonly y: number;
};

export type ErdosRenyiLayout = ReadonlyMap<number, ErdosRenyiLayoutPoint>;

function nextUnit(state: number) {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let mixed = nextState;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return {
    state: nextState,
    value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296,
  };
}

/**
 * A deterministic, uniform disk is a presentation coordinate system only.
 * It deliberately does not feed edge probability back from position or degree.
 */
export function createErdosRenyiLayout(
  graph: ErdosRenyiGraph,
  aspectRatio: number,
): ErdosRenyiLayout {
  const layout = new Map<number, ErdosRenyiLayoutPoint>();
  let randomState = graph.randomState ^ 0x9e3779b9;
  const safeAspect = Math.max(0.7, aspectRatio);

  for (const node of graph.nodes) {
    const angleDraw = nextUnit(randomState);
    const radiusDraw = nextUnit(angleDraw.state);
    randomState = radiusDraw.state;
    const angle = angleDraw.value * Math.PI * 2;
    const radius = Math.sqrt(radiusDraw.value) * 0.44;
    layout.set(node.id, {
      x: 0.5 + (Math.cos(angle) * radius) / safeAspect,
      y: 0.5 + Math.sin(angle) * radius,
    });
  }

  return layout;
}
