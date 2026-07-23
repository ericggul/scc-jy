"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import styled from "styled-components";
import {
  createInitialCycleSnapshot,
  type CycleNodeId,
} from "@/components/network-system/cycle/model";
import {
  presentCycleNewsDigest,
  type CycleNewsSignal,
} from "@/components/network-system/cycle/news/presenter";
import { useCycleSocket } from "@/components/network-system/cycle/transport";

type LaneItem = CycleNewsSignal & {
  key: string;
  entersWithTyping: boolean;
};

const initialSnapshot = createInitialCycleSnapshot();
const initialDigest = presentCycleNewsDigest(initialSnapshot);
const INITIAL_ROW_COUNT = 14;
const INITIAL_ITEMS_PER_LANE = 3;
const MIN_ROW_HEIGHT = 56;
const MIN_ROW_COUNT = 10;
const MAX_ROW_COUNT = 20;
const PIXELS_PER_SECOND_PER_ABSOLUTE_VALUE = 500;
const MINIMUM_MOVING_VALUE = 0.04;
const SPEED_RESPONSE = 3.2;

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
  will-change: transform;
  backface-visibility: hidden;
`;

const Headline = styled.span`
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  width: max-content;
  padding-inline: clamp(40px, 4vw, 72px);
  color: #11110f;
  font-size: clamp(15px, min(2.8vw, 4.5dvh), 52px);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 0.9;
  white-space: nowrap;
  opacity: 1;
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

function rowCountForViewport() {
  if (typeof window === "undefined") return INITIAL_ROW_COUNT;
  const height = window.visualViewport?.height ?? window.innerHeight;
  return clamp(
    Math.floor(height / MIN_ROW_HEIGHT),
    MIN_ROW_COUNT,
    MAX_ROW_COUNT,
  );
}

function speedForAbsoluteValue(value: number) {
  const magnitude = Number.isFinite(value) ? Math.abs(value) : 0;
  return (
    Math.max(magnitude, MINIMUM_MOVING_VALUE) *
    PIXELS_PER_SECOND_PER_ABSOLUTE_VALUE
  );
}

function makeInitialLane(
  signals: readonly CycleNewsSignal[],
  rowIndex: number,
) {
  const laneSignal = signals[rowIndex % signals.length];
  return Array.from({ length: INITIAL_ITEMS_PER_LANE }, (_, itemIndex) => {
    return {
      ...laneSignal,
      key: `lane-${rowIndex}-initial-${itemIndex}`,
      entersWithTyping: itemIndex > 0,
    };
  });
}

function TypingHeadline({
  item,
}: {
  item: LaneItem;
}) {
  return (
    <Headline
      data-headline-key={item.key}
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
  valuesRef,
  revisionRef,
}: {
  rowIndex: number;
  initialSignals: readonly CycleNewsSignal[];
  signalsRef: RefObject<readonly CycleNewsSignal[]>;
  valuesRef: RefObject<Record<CycleNodeId, number>>;
  revisionRef: RefObject<number>;
}) {
  const laneId = initialSignals[rowIndex % initialSignals.length].id;
  const [items, setItems] = useState<LaneItem[]>(() =>
    makeInitialLane(initialSignals, rowIndex),
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  const offsetRef = useRef(0);
  const speedRef = useRef(
    MINIMUM_MOVING_VALUE * PIXELS_PER_SECOND_PER_ABSOLUTE_VALUE,
  );
  const cursorRef = useRef(rowIndex + INITIAL_ITEMS_PER_LANE);
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
      const signals = signalsRef.current;
      if (signals.length === 0) return;
      const nextSignal =
        signals.find((signal) => signal.id === laneId) ??
        signals[cursorRef.current++ % signals.length];
      const nextItem: LaneItem = {
        ...nextSignal,
        key: `lane-${rowIndex}-stream-${sequenceRef.current++}`,
        entersWithTyping: true,
      };
      setItems((current) => [...current.slice(1), nextItem]);
    };

    const refreshOffscreenIncomingItem = () => {
      const revision = revisionRef.current;
      if (revision === appliedRevisionRef.current) return;
      const lastHeadline = track.lastElementChild as HTMLElement | null;
      if (!lastHeadline || lastHeadline.getBoundingClientRect().left < window.innerWidth) {
        return;
      }

      const signals = signalsRef.current;
      if (signals.length === 0) return;
      const nextSignal =
        signals.find((signal) => signal.id === laneId);
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

    const updateEnteringTypography = () => {
      const enteringHeadlines = track.querySelectorAll<HTMLElement>(
        '[data-enters-with-typing="true"]',
      );
      const startX = window.innerWidth * 0.8;
      const completeX = window.innerWidth * 0.75;
      const typingDistance = startX - completeX;

      enteringHeadlines.forEach((headline) => {
        const fullHeadline = headline.dataset.fullHeadline ?? "";
        const visibleHeadline = headline.querySelector<HTMLElement>(
          "[data-visible-headline]",
        );
        if (!visibleHeadline) return;
        const left = headline.getBoundingClientRect().left;
        const progress = clamp((startX - left) / typingDistance, 0, 1);
        const characterCount = Math.min(
          fullHeadline.length,
          Math.ceil(fullHeadline.length * progress),
        );
        const nextText = fullHeadline.slice(0, characterCount);
        if (visibleHeadline.textContent !== nextText) {
          visibleHeadline.textContent = nextText;
        }
      });
    };

    const animate = (now: number) => {
      if (disposed) return;
      const elapsed = Math.min(64, now - previousTime);
      previousTime = now;
      const firstHeadline = track.firstElementChild as HTMLElement | null;
      const firstWidth = firstHeadline?.offsetWidth ?? 0;

      if (!positionedInitialTrack && firstWidth > 0) {
        offsetRef.current = Math.max(
          0,
          firstWidth - window.innerWidth * 0.82,
        );
        positionedInitialTrack = true;
      }

      const targetSpeed = speedForAbsoluteValue(
        valuesRef.current[laneId],
      );
      const response =
        1 - Math.exp(-SPEED_RESPONSE * (elapsed / 1000));
      speedRef.current += (targetSpeed - speedRef.current) * response;
      offsetRef.current += (elapsed / 1000) * speedRef.current;

      if (firstWidth > 0 && offsetRef.current >= firstWidth) {
        flushSync(appendFromRight);
        offsetRef.current -= firstWidth;
      }

      track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      refreshOffscreenIncomingItem();
      updateEnteringTypography();
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [laneId, revisionRef, rowIndex, signalsRef, valuesRef]);

  return (
    <Lane>
      <Track ref={trackRef}>
        {items.map((item) => (
          <TypingHeadline key={item.key} item={item} />
        ))}
      </Track>
    </Lane>
  );
}

export default function CycleNewsScreen() {
  const [rowCount, setRowCount] = useState(INITIAL_ROW_COUNT);
  const signalsRef = useRef<readonly CycleNewsSignal[]>(initialDigest.signals);
  const valuesRef = useRef<Record<CycleNodeId, number>>(initialSnapshot.values);
  const revisionRef = useRef(0);

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

  useCycleSocket({
    role: "screen",
    retainState: false,
    onState: (snapshot) => {
      const digest = presentCycleNewsDigest(snapshot);
      signalsRef.current = digest.signals;
      valuesRef.current = snapshot.values;
      revisionRef.current = snapshot.revision;
    },
  });

  return (
    <Stage aria-label="Economic conditions headline feed">
      <Feed $rowCount={rowCount}>
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <NewsLane
            key={`news-lane-${rowIndex}`}
            rowIndex={rowIndex}
            initialSignals={initialDigest.signals}
            signalsRef={signalsRef}
            valuesRef={valuesRef}
            revisionRef={revisionRef}
          />
        ))}
      </Feed>
    </Stage>
  );
}
