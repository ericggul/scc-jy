"use client";

import { useEffect, useRef, useState } from "react";
import {
  markovEdgeIds,
  markovNodeIds,
  type MarkovSnapshot,
  type MarkovValues,
  type MarkovWeights,
} from "./model";

type MarkovDeltas = {
  values: MarkovValues;
  weights: MarkovWeights;
};

function zeroDeltas(): MarkovDeltas {
  return {
    values: Object.fromEntries(markovNodeIds.map((id) => [id, 0])) as MarkovValues,
    weights: Object.fromEntries(markovEdgeIds.map((id) => [id, 0])) as MarkovWeights,
  };
}

function copySnapshot(snapshot: MarkovSnapshot): MarkovSnapshot {
  return {
    ...snapshot,
    values: { ...snapshot.values },
    weights: { ...snapshot.weights },
  };
}

export function useMorphedMarkovState(snapshot: MarkovSnapshot) {
  const targetRef = useRef(copySnapshot(snapshot));
  const displayedRef = useRef(copySnapshot(snapshot));
  const previousTargetRef = useRef<MarkovSnapshot | null>(null);
  const [displayed, setDisplayed] = useState(() => copySnapshot(snapshot));
  const [deltas, setDeltas] = useState<MarkovDeltas>(() => zeroDeltas());

  useEffect(() => {
    const previous = previousTargetRef.current;
    if (previous) {
      setDeltas((current) => ({
        values: Object.fromEntries(
          markovNodeIds.map((id) => [id, snapshot.values[id] - previous.values[id]]),
        ) as MarkovValues,
        weights: Object.fromEntries(markovEdgeIds.map((id) => {
          const delta = snapshot.weights[id] - previous.weights[id];
          return [id, Math.abs(delta) > Number.EPSILON ? delta : current.weights[id]];
        })) as MarkovWeights,
      }));
    }
    previousTargetRef.current = copySnapshot(snapshot);
    targetRef.current = copySnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    let frame = 0;
    let previousTime = performance.now();

    const animate = (now: number) => {
      const elapsed = Math.min(Math.max(now - previousTime, 0), 50);
      previousTime = now;
      const blend = 1 - Math.exp(-elapsed / 72);
      const current = displayedRef.current;
      const target = targetRef.current;
      const next = copySnapshot(current);

      for (const id of markovNodeIds) {
        next.values[id] += (target.values[id] - current.values[id]) * blend;
      }
      for (const id of markovEdgeIds) {
        next.weights[id] += (target.weights[id] - current.weights[id]) * blend;
      }
      next.revision = target.revision;
      next.serverTime = target.serverTime;
      displayedRef.current = next;
      setDisplayed(next);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return { displayed, deltas };
}
