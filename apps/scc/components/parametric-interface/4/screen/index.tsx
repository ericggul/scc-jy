"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  departuresPerColumn,
  type Departure,
  withLyricDestinations,
} from "../model/departures";
import { useFlightLyric } from "../timeline/use-flight-lyric";
import styles from "./flight-information-atlas.module.css";

const REFRESH_DURATION_MS = 650;

type RefreshMode = "in" | "out" | undefined;

function FlightRow({
  activeWordPosition,
  flight,
  lyricWordCount,
  refresh,
  rowIndex,
}: {
  activeWordPosition: number;
  flight: Departure;
  lyricWordCount: number;
  refresh: RefreshMode;
  rowIndex: number;
}) {
  const isOutgoing = refresh === "out";
  const lyricWordPosition = lyricWordCount === 0 ? -1 : rowIndex % lyricWordCount;
  const isActiveWord = !isOutgoing && lyricWordPosition === activeWordPosition;
  const isPassedWord = !isOutgoing && lyricWordPosition < activeWordPosition;
  const status = isOutgoing
    ? flight.status
    : isActiveWord
      ? "Boarding"
      : lyricWordPosition < activeWordPosition
        ? "Gate Closed"
        : "Scheduled";
  const statusTone = isOutgoing
    ? undefined
    : isActiveWord
      ? "boarding"
      : lyricWordPosition < activeWordPosition
        ? "gate-closed"
        : "scheduled";

  return (
    <div
      aria-hidden={isOutgoing || undefined}
      className={styles.row}
      data-active-word={isActiveWord ? "true" : undefined}
      data-passed-word={isPassedWord ? "true" : undefined}
      data-refresh={refresh}
      role={isOutgoing ? undefined : "row"}
      style={{ "--refresh-delay": `${rowIndex * 16}ms` } as CSSProperties}
    >
      <time role="cell">{flight.time}</time>
      <i aria-hidden="true" className={styles.carrier} data-carrier={flight.carrier} />
      <span role="cell">{flight.flight}</span>
      <span role="cell">{flight.codeshare}</span>
      <strong role="cell">{flight.destination}</strong>
      <b data-terminal={flight.terminal} role="cell">{flight.terminal}</b>
      <span role="cell">{flight.gate}</span>
      <em data-status={statusTone} role="cell">{status}</em>
    </div>
  );
}

export default function FlightInformationAtlas() {
  const { activeWordPosition, cueIndex, lyricCues, reducedMotion } = useFlightLyric();
  const [displayedCueIndex, setDisplayedCueIndex] = useState(cueIndex);
  const [outgoingCueIndex, setOutgoingCueIndex] = useState<number | null>(null);
  const displayedCueIndexRef = useRef(cueIndex);

  useEffect(() => {
    const displayedCue = displayedCueIndexRef.current;

    if (reducedMotion || cueIndex === displayedCue) return;

    let completionTimeout: number | undefined;
    const startTimeout = window.setTimeout(() => {
      setOutgoingCueIndex(displayedCue);
      displayedCueIndexRef.current = cueIndex;
      setDisplayedCueIndex(cueIndex);
      completionTimeout = window.setTimeout(() => {
        setOutgoingCueIndex(null);
      }, REFRESH_DURATION_MS);
    }, 0);

    return () => {
      window.clearTimeout(startTimeout);
      if (completionTimeout !== undefined) window.clearTimeout(completionTimeout);
    };
  }, [cueIndex, reducedMotion]);

  const visibleCueIndex = reducedMotion ? cueIndex : displayedCueIndex;
  const panelFlights = withLyricDestinations(
    lyricCues[visibleCueIndex],
    activeWordPosition,
    visibleCueIndex,
  )
    .slice(0, departuresPerColumn);
  const outgoingPanelFlights =
    reducedMotion || outgoingCueIndex === null
      ? null
      : withLyricDestinations(lyricCues[outgoingCueIndex], Number.MAX_SAFE_INTEGER, outgoingCueIndex)
        .slice(0, departuresPerColumn);
  const outgoingLyricWordCount =
    outgoingCueIndex === null ? 0 : lyricCues[outgoingCueIndex]?.length ?? 0;

  return (
    <main aria-label="Airport departures flight information display" className={styles.stage}>
      <div className={styles.screen} role="table">
        {[0, 1].map((columnIndex) => (
          <section
            aria-label={`Departure list ${columnIndex + 1}`}
            className={styles.column}
            key={`departure-column-${columnIndex + 1}`}
            role="rowgroup"
          >
            <div className={styles.header} role="row">
              <span role="columnheader">Time</span>
              <span aria-hidden="true" />
              <span role="columnheader">Flight</span>
              <span role="columnheader">Codeshare</span>
              <span role="columnheader">Destination</span>
              <span role="columnheader">Term.</span>
              <span role="columnheader">Gate</span>
              <span role="columnheader">Status</span>
            </div>
            {panelFlights.map((flight, rowIndex) => {
              const outgoingFlight = outgoingPanelFlights?.[rowIndex];

              return (
                <div className={styles.rowSlot} key={flight.id} role="presentation">
                  {outgoingFlight ? (
                    <FlightRow
                      activeWordPosition={activeWordPosition}
                      flight={outgoingFlight}
                      lyricWordCount={outgoingLyricWordCount}
                      refresh="out"
                      rowIndex={rowIndex}
                    />
                  ) : null}
                  <FlightRow
                    activeWordPosition={activeWordPosition}
                    flight={flight}
                    lyricWordCount={lyricCues[visibleCueIndex]?.length ?? 0}
                    refresh={outgoingFlight ? "in" : undefined}
                    rowIndex={rowIndex}
                  />
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}
