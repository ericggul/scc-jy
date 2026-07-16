"use client";

import { useEffect, useRef, useState } from "react";
import { keyframes } from "styled-components";
import styled from "styled-components";
import { changedCycleNewsSignals, cycleNewsCadence, presentCycleNewsDigest, type CycleNewsDigest, type CycleNewsSignal } from "@/components/network-system/cycle/news/presenter";
import { createInitialCycleSnapshot } from "@/components/network-system/cycle/model";
import { useCycleSocket } from "@/components/network-system/cycle/transport";

type FeedRow = CycleNewsSignal & {
  key: string;
  transitionKey?: string;
  previousHeadline?: string;
};

type HeadlinePhase = "rest" | "clearing" | "typing";

const initialDigest = presentCycleNewsDigest(createInitialCycleSnapshot());
// Change this one value to scale the entire headline field together.
const HEADLINE_DENSITY = 2;
const INITIAL_ROW_COUNT = 14 * HEADLINE_DENSITY;
const MAX_PENDING_HEADLINES = 36;

const drift = keyframes`
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-50%, 0, 0);
  }
`;

const Stage = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #f4f3ef;
  color: #11110f;
  font-family: Arial, Helvetica, sans-serif;
  isolation: isolate;
`;

const Feed = styled.ol<{ $rowCount: number }>`
  display: grid;
  grid-template-rows: repeat(${({ $rowCount }) => $rowCount}, minmax(0, 1fr));
  width: 100%;
  height: 100%;
  margin: 0;
  padding: clamp(14px, 2.8vw, 42px) 0;
  list-style: none;
  contain: layout paint style;
`;

const HeadlineRow = styled.li<{ $intensity: number }>`
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  overflow: hidden;
  contain: layout paint style;
  border-top: 1px solid rgb(17 17 15 / 0.22);
  opacity: ${({ $intensity }) => 0.58 + $intensity * 0.42};

  &:last-child {
    border-bottom: 1px solid rgb(17 17 15 / 0.22);
  }
`;

const HeadlineTrack = styled.div<{ $duration: number }>`
  display: flex;
  width: max-content;
  will-change: transform;
  backface-visibility: hidden;
  animation: ${drift} ${({ $duration }) => $duration}s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Headline = styled.span<{ $phase: HeadlinePhase }>`
  display: block;
  flex: 0 0 auto;
  min-width: ${100 / HEADLINE_DENSITY}vw;
  padding-inline: clamp(${12 / HEADLINE_DENSITY}px, ${2.25 / HEADLINE_DENSITY}vw, ${34 / HEADLINE_DENSITY}px);
  overflow: hidden;
  color: inherit;
  font-size: clamp(${15 / HEADLINE_DENSITY}px, min(${2.8 / HEADLINE_DENSITY}vw, ${4.5 / HEADLINE_DENSITY}dvh), ${52 / HEADLINE_DENSITY}px);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 0.9;
  text-overflow: clip;
  white-space: nowrap;
  opacity: ${({ $phase }) => ($phase === "clearing" ? 0 : 1)};
  transform: translate3d(0, ${({ $phase }) => ($phase === "clearing" ? "8%" : "0")}, 0);
  transition:
    opacity 120ms ease-out,
    transform 120ms ease-out;
`;

function rowCountForViewport() {
  if (typeof window === "undefined") return 10;
  const height = window.visualViewport?.height ?? window.innerHeight;
  return Math.max(9 * HEADLINE_DENSITY, Math.min(26 * HEADLINE_DENSITY, Math.round(height / (80 / HEADLINE_DENSITY))));
}

function makeRows(signals: readonly CycleNewsSignal[], rowCount: number) {
  const fallback: CycleNewsSignal = {
    id: "production",
    headline: "ECONOMIC CONDITIONS HOLD",
    signature: "waiting",
    intensity: 0,
    percent: 0,
    regime: "steady",
  };
  const source = signals.length > 0 ? signals : [fallback];

  return Array.from({ length: rowCount }, (_, index) => {
    const signal = source[index % source.length];
    return { ...signal, key: `slot-${index}` };
  });
}

function appendLatestSignals(current: readonly CycleNewsSignal[], incoming: readonly CycleNewsSignal[]) {
  const incomingIds = new Set(incoming.map((signal) => signal.id));
  return [...current.filter((signal) => !incomingIds.has(signal.id)), ...incoming].slice(-MAX_PENDING_HEADLINES);
}

function resizeRows(rows: readonly FeedRow[], rowCount: number, signals: readonly CycleNewsSignal[]) {
  if (rows.length === rowCount) return [...rows];
  if (rows.length > rowCount) return rows.slice(rows.length - rowCount);

  const extension = makeRows(signals, rowCount - rows.length).map((row, index) => ({
    ...row,
    key: `slot-${rows.length + index}`,
  }));
  return [...rows, ...extension];
}

function TypewriterHeadline({ headline, transitionKey, previousHeadline }: { headline: string; transitionKey?: string; previousHeadline?: string }) {
  const [typedHeadline, setTypedHeadline] = useState(headline);
  const [phase, setPhase] = useState<HeadlinePhase>("rest");
  const [completedTransitionKey, setCompletedTransitionKey] = useState<string>();

  useEffect(() => {
    if (!transitionKey) return;

    let cancelled = false;
    let frame: number | null = null;
    const beginTimeoutId = window.setTimeout(() => {
      if (!cancelled) setPhase("clearing");
    }, 0);
    const clearTimeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setTypedHeadline("");
      setPhase("typing");

      const startedAt = performance.now();
      const duration = Math.max(260, Math.min(680, headline.length * 13));
      const type = (now: number) => {
        if (cancelled) return;
        const characterCount = Math.min(headline.length, Math.ceil(((now - startedAt) / duration) * headline.length));
        setTypedHeadline(headline.slice(0, characterCount));
        if (characterCount < headline.length) {
          frame = window.requestAnimationFrame(type);
        } else {
          setPhase("rest");
          setCompletedTransitionKey(transitionKey);
        }
      };
      frame = window.requestAnimationFrame(type);
    }, 140);

    return () => {
      cancelled = true;
      window.clearTimeout(beginTimeoutId);
      window.clearTimeout(clearTimeoutId);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [headline, transitionKey]);

  const isEntering = transitionKey !== undefined && transitionKey !== completedTransitionKey;
  const visibleHeadline = !transitionKey ? headline : phase === "typing" ? typedHeadline : isEntering || phase === "clearing" ? (previousHeadline ?? typedHeadline) : typedHeadline;
  const visiblePhase = transitionKey ? phase : "rest";

  return (
    <>
      <Headline $phase={visiblePhase}>{visibleHeadline}</Headline>
      <Headline $phase={visiblePhase} aria-hidden="true">
        {visibleHeadline}
      </Headline>
    </>
  );
}

export default function CycleNewsScreen() {
  const [rowCount, setRowCount] = useState(INITIAL_ROW_COUNT);
  const [rows, setRows] = useState<FeedRow[]>(() => makeRows(initialDigest.signals, INITIAL_ROW_COUNT));
  const digestRef = useRef<CycleNewsDigest>(initialDigest);
  const signalsRef = useRef<readonly CycleNewsSignal[]>(initialDigest.signals);
  const pendingRef = useRef<CycleNewsSignal[]>([]);
  const activityRef = useRef(initialDigest.activity);
  const rowCountRef = useRef(INITIAL_ROW_COUNT);
  const rescheduleRef = useRef<(() => void) | null>(null);
  const flushRef = useRef<(() => void) | null>(null);
  const sequenceRef = useRef(0);
  const signalCursorRef = useRef(0);
  const rowCursorRef = useRef(0);
  const runIdRef = useRef<string | null>(null);

  useEffect(() => {
    const updateRowCount = () => setRowCount(rowCountForViewport());
    updateRowCount();
    window.addEventListener("resize", updateRowCount);
    window.visualViewport?.addEventListener("resize", updateRowCount);
    return () => {
      window.removeEventListener("resize", updateRowCount);
      window.visualViewport?.removeEventListener("resize", updateRowCount);
    };
  }, []);

  useEffect(() => {
    rowCountRef.current = rowCount;
  }, [rowCount]);

  useEffect(() => {
    setRows((current) => resizeRows(current, rowCount, signalsRef.current));
  }, [rowCount]);

  useCycleSocket({
    role: "screen",
    retainState: false,
    onState: (snapshot) => {
      const nextDigest = presentCycleNewsDigest(snapshot);
      const previousCadence = cycleNewsCadence(activityRef.current);
      const nextCadence = cycleNewsCadence(nextDigest.activity);
      const isNewRun = runIdRef.current !== null && runIdRef.current !== snapshot.runId;
      let shouldFlush = false;

      if (runIdRef.current === null || isNewRun) {
        pendingRef.current = [...nextDigest.signals];
        setRows(makeRows(nextDigest.signals, rowCountRef.current));
      } else {
        const changedSignals = changedCycleNewsSignals(digestRef.current, nextDigest);
        pendingRef.current = appendLatestSignals(pendingRef.current, changedSignals);

        shouldFlush = changedSignals.length > 0;
      }

      runIdRef.current = snapshot.runId;
      digestRef.current = nextDigest;
      signalsRef.current = nextDigest.signals;
      activityRef.current = nextDigest.activity;
      if (shouldFlush) flushRef.current?.();
      if (nextCadence + 160 < previousCadence) {
        rescheduleRef.current?.();
      }
    },
  });

  useEffect(() => {
    let cancelled = false;
    let timeout: number | null = null;

    const schedule = () => {
      if (cancelled) return;
      if (timeout !== null) window.clearTimeout(timeout);
      timeout = window.setTimeout(advance, cycleNewsCadence(activityRef.current));
    };

    const advance = () => {
      if (cancelled) return;
      const signals = signalsRef.current;
      const updates = Array.from({ length: HEADLINE_DENSITY }, () => {
        const next = pendingRef.current.shift() ?? signals[signalCursorRef.current++ % Math.max(1, signals.length)];
        return next
          ? {
              signal: next,
              transitionKey: `feed-${sequenceRef.current++}-${next.signature}`,
            }
          : null;
      }).filter((update): update is NonNullable<typeof update> => update !== null);

      if (updates.length > 0) {
        const firstRowIndex = rowCursorRef.current;
        rowCursorRef.current += updates.length;
        setRows((current) => {
          if (current.length === 0) return current;
          const updatesByRowIndex = new Map(updates.map((update, index) => [(firstRowIndex + index) % current.length, update]));
          return current.map((row, index) =>
            updatesByRowIndex.has(index)
              ? {
                  ...updatesByRowIndex.get(index)!.signal,
                  key: row.key,
                  previousHeadline: row.headline,
                  transitionKey: updatesByRowIndex.get(index)!.transitionKey,
                }
              : row,
          );
        });
      }
      schedule();
    };

    rescheduleRef.current = schedule;
    flushRef.current = advance;
    schedule();
    return () => {
      cancelled = true;
      if (timeout !== null) window.clearTimeout(timeout);
      if (rescheduleRef.current === schedule) {
        rescheduleRef.current = null;
      }
      if (flushRef.current === advance) {
        flushRef.current = null;
      }
    };
  }, [rowCount]);

  return (
    <Stage aria-label="Economic conditions headline feed">
      <Feed $rowCount={rowCount}>
        {rows.map((row, index) => (
          <HeadlineRow key={row.key} $intensity={row.intensity}>
            <HeadlineTrack $duration={(14 + (index % 5) * 1.25) / HEADLINE_DENSITY}>
              <TypewriterHeadline headline={row.headline} transitionKey={row.transitionKey} previousHeadline={row.previousHeadline} />
            </HeadlineTrack>
          </HeadlineRow>
        ))}
      </Feed>
    </Stage>
  );
}
