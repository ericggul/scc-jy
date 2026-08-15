"use client";

import { withEmbeddedLyric } from "../model/departures";
import { useFlightLyric } from "../timeline/use-flight-lyric";
import styles from "./flight-information-atlas.module.css";

export default function FlightInformationAtlas() {
  const { lyric, revealedWordCount } = useFlightLyric();
  const flights = withEmbeddedLyric(lyric, revealedWordCount);

  return (
    <main aria-label="Airport departures flight information display" className={styles.stage}>
      <div className={styles.screen} role="table">
        <div className={styles.header} role="row">
          <span role="columnheader">Time</span>
          <span aria-hidden="true" />
          <span role="columnheader">Flight</span>
          <span role="columnheader">Via</span>
          <span role="columnheader">Destination</span>
          <span role="columnheader">Term.</span>
          <span role="columnheader">Gate</span>
          <span role="columnheader">Status</span>
        </div>
        {flights.map((flight) => (
          <div className={styles.row} key={flight.id} role="row">
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
      </div>
    </main>
  );
}
