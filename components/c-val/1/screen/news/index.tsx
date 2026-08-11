"use client";

import { memo, startTransition, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { CValSnapshot } from "@/components/c-val/1/model";
import { CValBloombergWorkstationFrame } from "@/components/c-val/1/visual";
import { cValSocietyAdmissionIntervalMs } from "../cadence";
import {
  cValNewsAdmissionIntervalMs,
  presentCValNewsEvents,
  type CValNewsEvent,
} from "./presenter";
import { presentCValSocietyEvents } from "./society-presenter";

const COLUMN_RECORDS = 27;
const PENDING_NEWS_CAPACITY = 16;

const NewsTerminal = styled(CValBloombergWorkstationFrame)`
  --news-ink: #000;
  --news-header: #171717;
  --news-header-deep: #0c0c0c;
  --news-rule: #303030;
  --news-blue: #1559a8;
  --news-cyan: #70c9e6;
  --news-wire: #f0a000;

  background: var(--news-ink);
  color: #e8e7df;
  display: grid;
  font-size: clamp(10px, min(0.818cqw, 1.6cqh), 22px);
  grid-template-rows: 1.917em minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  width: 100%;
`;

const StreamBar = styled.div`
  align-items: center;
  background: var(--news-header);
  border-bottom: 1px solid #484848;
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  min-width: 0;
`;

const StreamLabel = styled.div`
  color: var(--news-wire);
  font-family: var(--cval-bloomberg-sans);
  font-size: 1.08em;
  font-weight: 800;
  padding: 0 0.85em;
  white-space: nowrap;
`;

const StreamReadout = styled.div`
  color: var(--news-cyan);
  font-size: 0.92em;
  padding: 0 0.85em;
  white-space: nowrap;
`;

const NewsColumns = styled.main`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 0;
  overflow: hidden;
`;

const WirePane = styled.section`
  --news-index-column: 3.4ch;

  contain: layout paint;
  counter-reset: news-index;
  display: grid;
  grid-template-rows: 2.05em repeat(${COLUMN_RECORDS}, minmax(1.95em, 1fr));
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;

  &:first-child { border-right: 1px solid #555; }
`;

const PaneHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid var(--news-rule);
  color: #f0f0ec;
  display: grid;
  font-family: var(--cval-bloomberg-sans);
  font-size: 1.14em;
  font-weight: 600;
  grid-template-columns: var(--news-index-column) minmax(0, 1fr) 4.35em 5.9em;
  letter-spacing: -0.015em;
  min-width: 0;
  padding: 0 0.52em;

  strong {
    font: inherit;
    grid-column: 2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: var(--news-cyan);
    font-family: var(--cval-bloomberg-mono);
    font-size: 0.72em;
    font-weight: 500;
    text-align: right;
  }
`;

const WireItem = styled.article`
  align-items: center;
  border-bottom: 1px solid #202020;
  contain: layout paint;
  counter-increment: news-index;
  display: grid;
  font-size: 1.18em;
  grid-template-columns: var(--news-index-column) minmax(0, 1fr) 4.35em 5.9em;
  line-height: 1;
  min-width: 0;
  padding: 0 0.52em;

  &::before {
    color: #d8d7d0;
    content: counter(news-index, decimal-leading-zero) ")";
    font-family: var(--cval-bloomberg-mono);
    justify-self: start;
    text-align: left;
    width: 3ch;
  }

  [data-headline] {
    color: var(--news-wire);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  [data-context] {
    color: #f0a000;
    font-size: 0.83em;
    padding: 0 0.38em;
    text-align: right;
  }

  [data-change] {
    color: #e7e5de;
    font-size: 0.83em;
    text-align: right;
    white-space: nowrap;
  }

  [data-change="positive"] { color: #60cd84; }
  [data-change="negative"] { color: #ff737e; }
`;

function signed(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function changeTone(value: number) {
  if (!Number.isFinite(value)) return "neutral";
  if (value > 0.0005) return "positive";
  if (value < -0.0005) return "negative";
  return "neutral";
}

type CValNewsPresenter = (
  previous: CValSnapshot | null,
  snapshot: CValSnapshot,
  visibleTemplateIds: ReadonlySet<string>,
) => CValNewsEvent[];

type CValNewsThreadTiming = "market" | "society";

function useCValNewsThread(
  snapshot: CValSnapshot,
  presentEvents: CValNewsPresenter,
  timing: CValNewsThreadTiming,
) {
  const previousRef = useRef<CValSnapshot | null>(null);
  const seenIdsRef = useRef(new Set<string>());
  const visibleHeadlinesRef = useRef(new Set<string>());
  const visibleTemplateIdsRef = useRef(new Set<string>());
  const recordsRef = useRef<CValNewsEvent[]>([]);
  const pendingRef = useRef<CValNewsEvent[]>([]);
  const lastAdmissionAtRef = useRef<number | null>(null);
  const marketMoveRef = useRef(snapshot.market.oneSecondMovePercent);
  const cadenceRef = useRef(
    timing === "market"
      ? cValNewsAdmissionIntervalMs(snapshot.market.oneSecondMovePercent)
      : cValSocietyAdmissionIntervalMs(snapshot.market.oneSecondMovePercent),
  );
  const scheduleNextRef = useRef<() => void>(() => {});
  const runRef = useRef(snapshot.runId);
  const [records, setRecords] = useState<CValNewsEvent[]>([]);

  useEffect(() => {
    let timer: number | null = null;
    let disposed = false;

    const scheduleNext = () => {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
      if (disposed || pendingRef.current.length === 0) return;

      const now = performance.now();
      const elapsed = lastAdmissionAtRef.current == null ? Number.POSITIVE_INFINITY : now - lastAdmissionAtRef.current;
      const delay = Math.max(0, cadenceRef.current - elapsed);
      timer = window.setTimeout(() => {
        timer = null;
        if (disposed) return;

        const [nextStory, ...remaining] = pendingRef.current;
        pendingRef.current = remaining;
        if (!nextStory) return;

        const nextRecords = [nextStory, ...recordsRef.current].slice(0, COLUMN_RECORDS);
        recordsRef.current = nextRecords;
        visibleHeadlinesRef.current = new Set(nextRecords.map((event) => event.headline));
        visibleTemplateIdsRef.current = new Set(nextRecords.map((event) => event.templateId));
        lastAdmissionAtRef.current = performance.now();
        if (timing === "society") {
          cadenceRef.current = cValSocietyAdmissionIntervalMs(marketMoveRef.current);
        }
        startTransition(() => setRecords(nextRecords));
        scheduleNext();
      }, delay);
    };

    scheduleNextRef.current = scheduleNext;
    return () => {
      disposed = true;
      if (timer != null) window.clearTimeout(timer);
      scheduleNextRef.current = () => {};
    };
  }, [timing]);

  useEffect(() => {
    if (runRef.current !== snapshot.runId) {
      runRef.current = snapshot.runId;
      previousRef.current = null;
      seenIdsRef.current.clear();
      visibleHeadlinesRef.current.clear();
      visibleTemplateIdsRef.current.clear();
      recordsRef.current = [];
      pendingRef.current = [];
      lastAdmissionAtRef.current = null;
      startTransition(() => setRecords(recordsRef.current));
    }

    if (recordsRef.current.some((event) => !Number.isFinite(event.oneDayMove) || !event.templateId)) {
      previousRef.current = null;
      seenIdsRef.current.clear();
      visibleHeadlinesRef.current.clear();
      visibleTemplateIdsRef.current.clear();
      recordsRef.current = [];
      pendingRef.current = [];
      lastAdmissionAtRef.current = null;
      startTransition(() => setRecords(recordsRef.current));
    }

    marketMoveRef.current = snapshot.market.oneSecondMovePercent;
    if (timing === "market") {
      cadenceRef.current = cValNewsAdmissionIntervalMs(snapshot.market.oneSecondMovePercent);
    }
    scheduleNextRef.current();
    const reservedTemplateIds = new Set([
      ...visibleTemplateIdsRef.current,
      ...pendingRef.current.map((event) => event.templateId),
    ]);
    const candidates = presentEvents(previousRef.current, snapshot, reservedTemplateIds);
    previousRef.current = snapshot;

    const additions = candidates.filter((event) => !seenIdsRef.current.has(event.id));
    additions.forEach((event) => seenIdsRef.current.add(event.id));

    const pendingHeadlines = new Set(pendingRef.current.map((event) => event.headline));
    const pendingTemplateIds = new Set(pendingRef.current.map((event) => event.templateId));
    const uniqueAdditions = additions.filter((event) => {
      if (
        visibleHeadlinesRef.current.has(event.headline)
        || pendingHeadlines.has(event.headline)
        || visibleTemplateIdsRef.current.has(event.templateId)
        || pendingTemplateIds.has(event.templateId)
      ) return false;
      pendingHeadlines.add(event.headline);
      pendingTemplateIds.add(event.templateId);
      return true;
    });
    if (uniqueAdditions.length === 0) return;

    if (timing === "society" && lastAdmissionAtRef.current == null) {
      lastAdmissionAtRef.current = performance.now();
      cadenceRef.current = cValSocietyAdmissionIntervalMs(snapshot.market.oneSecondMovePercent);
    }
    pendingRef.current = [...pendingRef.current, ...uniqueAdditions]
      .slice(-PENDING_NEWS_CAPACITY);
    scheduleNextRef.current();
  }, [presentEvents, snapshot, timing]);

  return records;
}

const NewsItem = memo(function NewsItem({ event }: { event: CValNewsEvent }) {
  const oneDayMove = Number.isFinite(event.oneDayMove) ? event.oneDayMove : Number.NaN;

  return (
    <WireItem data-event-id={event.id}>
      <span data-headline title={event.headline}>{event.headline}</span>
      <span data-context>{event.code}</span>
      <span data-change={changeTone(oneDayMove)}>{signed(oneDayMove)}</span>
    </WireItem>
  );
});

const NewsArchive = memo(function NewsArchive({
  marketRecords,
  societyRecords,
}: {
  marketRecords: CValNewsEvent[];
  societyRecords: CValNewsEvent[];
}) {
  return (
    <NewsColumns>
      <WirePane aria-label="C-VAL market and finance news records">
        <PaneHeader>
          <strong>Market / Finance</strong>
          <span>TYPE</span>
          <span>1D MOVE</span>
        </PaneHeader>
        {marketRecords.map((event) => <NewsItem key={event.id} event={event} />)}
      </WirePane>
      <WirePane aria-label="C-VAL society and politics news records">
        <PaneHeader>
          <strong>Society / Politics</strong>
          <span>TYPE</span>
          <span>1D MOVE</span>
        </PaneHeader>
        {societyRecords.map((event) => <NewsItem key={event.id} event={event} />)}
      </WirePane>
    </NewsColumns>
  );
});

export default function CValNewsScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const marketRecords = useCValNewsThread(snapshot, presentCValNewsEvents, "market");
  const societyRecords = useCValNewsThread(snapshot, presentCValSocietyEvents, "society");

  return (
    <NewsTerminal aria-label="C-VAL continuously accumulating public-signal news wire">
      <StreamBar>
        <StreamLabel>NEWS ROOM</StreamLabel>
        <StreamReadout>LAST {snapshot.market.index.toFixed(2)}</StreamReadout>
      </StreamBar>
      <NewsArchive marketRecords={marketRecords} societyRecords={societyRecords} />
    </NewsTerminal>
  );
}
