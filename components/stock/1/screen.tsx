"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StockDashboard, {
  type LiveStockStreams,
  type TimeRange,
  seriesForRange,
  stocks,
} from "../default/dashboard";
import {
  advanceStockStreams,
  createInitialStockStreams,
  interpolateFactors,
  orientationToFactors,
} from "./market-model";
import type { StockOrientationSignal } from "./types";
import { useStockSocket } from "./use-stock-socket";

type EngineState = ReturnType<typeof createInitialStockStreams>;

function createEngine(range: TimeRange) {
  return createInitialStockStreams(stocks, range, seriesForRange);
}

function LiveStockDashboard({
  orientation,
  range,
  setRange,
}: {
  orientation: StockOrientationSignal | null;
  range: TimeRange;
  setRange: (range: TimeRange) => void;
}) {
  const initialFactors = orientationToFactors(orientation);
  const [engine] = useState<EngineState>(() => createEngine(range));
  const orientationRef = useRef(orientation);
  const factorsRef = useRef(initialFactors);
  const sequenceRef = useRef(0);
  const [streams, setStreams] = useState<LiveStockStreams>(() =>
    advanceStockStreams(engine, initialFactors, 0, 0),
  );

  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  useEffect(() => {
    let frame = 0;
    let previousTime = performance.now();

    const animate = (time: number) => {
      const elapsed = Math.min(Math.max(time - previousTime, 0), 48);
      previousTime = time;
      factorsRef.current = interpolateFactors(
        factorsRef.current,
        orientationToFactors(orientationRef.current),
      );
      sequenceRef.current += 1;
      setStreams(
        advanceStockStreams(
          engine,
          factorsRef.current,
          elapsed,
          sequenceRef.current,
        ),
      );
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [engine]);

  return (
    <StockDashboard
      liveStreams={streams}
      onRangeChange={setRange}
      range={range}
    />
  );
}

export default function StockOneScreen() {
  const [orientation, setOrientation] = useState<StockOrientationSignal | null>(null);
  const [range, setRange] = useState<TimeRange>("1D");
  const handleOrientation = useCallback((signal: StockOrientationSignal) => {
    setOrientation(signal);
  }, []);

  useStockSocket({ onOrientation: handleOrientation, role: "screen" });

  return (
    <LiveStockDashboard
      key={range}
      orientation={orientation}
      range={range}
      setRange={setRange}
    />
  );
}
