"use client";

import type { CSSProperties } from "react";
import { departuresPerColumn, withLyricDestinations } from "../model/departures";
import { useFlightLyric } from "../timeline/use-flight-lyric";
import styles from "./flight-information-atlas.module.css";

export default function FlightInformationAtlas() {
  const { lyric, activeWord, cueIndex } = useFlightLyric();
  const flights = withLyricDestinations(lyric);
  const panelFlights = flights.slice(0, departuresPerColumn);
  const columns = [panelFlights, panelFlights];

  return (
    <main aria-label="Airport departures flight information display" className={styles.stage}>
      <div className={styles.screen} role="table">
        {columns.map((column, columnIndex) => (
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
            {column.map((flight, rowIndex) => (
              <div
                className={styles.row}
                data-active-word={flight.destination === activeWord || undefined}
                key={`${flight.id}-cue-${cueIndex}`}
                role="row"
                style={{ "--refresh-delay": `${rowIndex * 18}ms` } as CSSProperties}
              >
                <time role="cell">{flight.time}</time>
                <i aria-hidden="true" className={styles.carrier} data-carrier={flight.carrier} />
                <span role="cell">{flight.flight}</span>
                <span role="cell">{flight.codeshare}</span>
                <strong role="cell">{flight.destination}</strong>
                <b data-terminal={flight.terminal} role="cell">{flight.terminal}</b>
                <span role="cell">{flight.gate}</span>
                <em role="cell">{flight.status}</em>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
