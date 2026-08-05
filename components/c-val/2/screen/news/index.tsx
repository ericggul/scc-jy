"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import styled from "styled-components";
import type { CValSnapshot } from "@/components/c-val/2/model";
import {
  presentCValNews,
  type CValNewsContext,
  type CValNewsSignal,
} from "./presenter";

type LaneItem = CValNewsSignal & {
  key: string;
  entersWithTyping: boolean;
};

const INITIAL_ROW_COUNT = 14;
const INITIAL_ITEMS_PER_LANE = 3;
const MIN_ROW_HEIGHT = 56;
const MIN_ROW_COUNT = 10;
const MAX_ROW_COUNT = 20;
const MINIMUM_SPEED = 20;
const MAXIMUM_SPEED = 360;
const SPEED_RESPONSE = 3.2;

const Stage = styled.main`
  width: 100%;
  height: 100%;
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
  padding: 0;
  list-style: none;
  contain: layout paint style;
`;

const Lane = styled.li`
  position: relative;
  min-width: 0;
  overflow: hidden;
  contain: strict;
  border-top: 1px solid rgb(17 17 15 / 0.22);

  &:last-child {
    border-bottom: 1px solid rgb(17 17 15 / 0.22);
  }
`;

const Track = styled.div`
  position: absolute;
  inset-block: 0;
  left: 0;
  display: flex;
  width: max-content;
  backface-visibility: hidden;
  will-change: transform;
`;

const Headline = styled.span`
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  width: max-content;
  padding-inline: clamp(48px, 6cqw, 108px);
  color: #11110f;
  font-size: clamp(15px, min(2.8cqw, 4.5cqh), 52px);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 0.9;
  white-space: nowrap;
`;

const HeadlineMeasure = styled.span`
  visibility: hidden;
  white-space: pre;
  pointer-events: none;
`;

const HeadlineText = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding-inline: inherit;
  white-space: pre;
`;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function rowCountForHeight(height: number) {
  return clamp(Math.floor(height / MIN_ROW_HEIGHT), MIN_ROW_COUNT, MAX_ROW_COUNT);
}

function speedForIntensity(intensity: number) {
  const safeIntensity = Number.isFinite(intensity) ? clamp(intensity, 0, 1) : 0;
  return MINIMUM_SPEED + safeIntensity * (MAXIMUM_SPEED - MINIMUM_SPEED);
}

function makeInitialLane(signals: readonly CValNewsSignal[], rowIndex: number) {
  const laneSignal = signals[rowIndex % signals.length];
  return Array.from({ length: INITIAL_ITEMS_PER_LANE }, (_, itemIndex) => ({
    ...laneSignal,
    key: `lane-${rowIndex}-initial-${itemIndex}`,
    entersWithTyping: itemIndex > 0,
  }));
}

function TypingHeadline({ item }: { item: LaneItem }) {
  return (
    <Headline
      data-enters-with-typing={item.entersWithTyping ? "true" : "false"}
      data-full-headline={item.headline}
    >
      <HeadlineMeasure aria-hidden="true">{item.headline}</HeadlineMeasure>
      <HeadlineText data-visible-headline="">
        {item.entersWithTyping ? "" : item.headline}
      </HeadlineText>
    </Headline>
  );
}

function NewsLane({
  rowIndex,
  initialSignals,
  signalsRef,
  intensityRef,
  revisionRef,
}: {
  rowIndex: number;
  initialSignals: readonly CValNewsSignal[];
  signalsRef: RefObject<readonly CValNewsSignal[]>;
  intensityRef: RefObject<Record<CValNewsContext, number>>;
  revisionRef: RefObject<number>;
}) {
  const laneId = initialSignals[rowIndex % initialSignals.length].id;
  const [items, setItems] = useState<LaneItem[]>(() =>
    makeInitialLane(initialSignals, rowIndex),
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  const offsetRef = useRef(0);
  const speedRef = useRef(MINIMUM_SPEED);
  const sequenceRef = useRef(0);
  const appliedRevisionRef = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let animationFrame = 0;
    let previousTime = performance.now();
    let disposed = false;
    let positionedInitialTrack = false;

    const appendFromRight = () => {
      const nextSignal = signalsRef.current.find((signal) => signal.id === laneId);
      if (!nextSignal) return;
      const nextItem: LaneItem = {
        ...nextSignal,
        key: `lane-${rowIndex}-stream-${sequenceRef.current++}`,
        entersWithTyping: true,
      };
      setItems((current) => [...current.slice(1), nextItem]);
    };

    const refreshOffscreenIncomingItem = (viewportWidth: number) => {
      const revision = revisionRef.current;
      if (revision === appliedRevisionRef.current) return;
      const lastHeadline = track.lastElementChild as HTMLElement | null;
      if (!lastHeadline || lastHeadline.getBoundingClientRect().left < viewportWidth) return;
      const nextSignal = signalsRef.current.find((signal) => signal.id === laneId);
      if (!nextSignal) return;
      const currentIncoming = itemsRef.current.at(-1);
      if (currentIncoming?.signature === nextSignal.signature) {
        appliedRevisionRef.current = revision;
        return;
      }
      const nextItem: LaneItem = {
        ...nextSignal,
        key: `lane-${rowIndex}-incoming-${revision}`,
        entersWithTyping: true,
      };
      flushSync(() => {
        setItems((current) => [...current.slice(0, -1), nextItem]);
      });
      appliedRevisionRef.current = revision;
    };

    const updateEnteringTypography = (viewportWidth: number) => {
      const startX = viewportWidth * 0.8;
      const completeX = viewportWidth * 0.75;
      const typingDistance = Math.max(1, startX - completeX);
      track.querySelectorAll<HTMLElement>('[data-enters-with-typing="true"]').forEach((headline) => {
        const fullHeadline = headline.dataset.fullHeadline ?? "";
        const visibleHeadline = headline.querySelector<HTMLElement>("[data-visible-headline]");
        if (!visibleHeadline) return;
        const progress = clamp((startX - headline.getBoundingClientRect().left) / typingDistance, 0, 1);
        const nextText = fullHeadline.slice(0, Math.ceil(fullHeadline.length * progress));
        if (visibleHeadline.textContent !== nextText) visibleHeadline.textContent = nextText;
      });
    };

    const animate = (now: number) => {
      if (disposed) return;
      const elapsed = Math.min(64, now - previousTime);
      previousTime = now;
      const viewportWidth = track.parentElement?.clientWidth ?? window.innerWidth;
      const firstHeadline = track.firstElementChild as HTMLElement | null;
      const firstWidth = firstHeadline?.offsetWidth ?? 0;

      if (!positionedInitialTrack && firstWidth > 0) {
        offsetRef.current = Math.max(0, firstWidth - viewportWidth * 0.82);
        positionedInitialTrack = true;
      }

      const targetSpeed = speedForIntensity(intensityRef.current[laneId]);
      const response = 1 - Math.exp(-SPEED_RESPONSE * (elapsed / 1000));
      speedRef.current += (targetSpeed - speedRef.current) * response;
      offsetRef.current += (elapsed / 1000) * speedRef.current;

      if (firstWidth > 0 && offsetRef.current >= firstWidth) {
        flushSync(appendFromRight);
        offsetRef.current -= firstWidth;
      }

      track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      refreshOffscreenIncomingItem(viewportWidth);
      updateEnteringTypography(viewportWidth);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [intensityRef, laneId, revisionRef, rowIndex, signalsRef]);

  return (
    <Lane>
      <Track ref={trackRef}>
        {items.map((item) => <TypingHeadline key={item.key} item={item} />)}
      </Track>
    </Lane>
  );
}

export default function CValNewsScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const stageRef = useRef<HTMLElement>(null);
  const [rowCount, setRowCount] = useState(INITIAL_ROW_COUNT);
  const [initialSignals] = useState(() => presentCValNews(snapshot));
  const signalsRef = useRef<readonly CValNewsSignal[]>(initialSignals);
  const intensityRef = useRef<Record<CValNewsContext, number>>(
    Object.fromEntries(initialSignals.map((signal) => [signal.id, signal.intensity])) as Record<CValNewsContext, number>,
  );
  const revisionRef = useRef(snapshot.revision);
  const currentSignals = presentCValNews(snapshot);

  useEffect(() => {
    signalsRef.current = currentSignals;
    intensityRef.current = Object.fromEntries(
      currentSignals.map((signal) => [signal.id, signal.intensity]),
    ) as Record<CValNewsContext, number>;
    revisionRef.current = snapshot.revision;
  }, [currentSignals, snapshot.revision]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateRows = () => setRowCount(rowCountForHeight(stage.clientHeight));
    const observer = new ResizeObserver(updateRows);
    observer.observe(stage);
    updateRows();
    return () => observer.disconnect();
  }, []);

  return (
    <Stage
      ref={stageRef}
      aria-label="Market price translated into financial, economic, and social headlines"
      data-market-revision={snapshot.revision}
      data-market-index={snapshot.market.index.toFixed(2)}
      data-market-change={snapshot.market.changeFromOpenPercent.toFixed(2)}
      data-market-short-move={snapshot.market.oneSecondMovePercent.toFixed(2)}
    >
      <Feed $rowCount={rowCount}>
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <NewsLane
            key={`c-val-news-lane-${rowIndex}`}
            rowIndex={rowIndex}
            initialSignals={initialSignals}
            signalsRef={signalsRef}
            intensityRef={intensityRef}
            revisionRef={revisionRef}
          />
        ))}
      </Feed>
    </Stage>
  );
}
