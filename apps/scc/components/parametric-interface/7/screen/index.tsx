"use client";

import { lyricWordTimings } from "../../model/lyrics";
import { useLyricCue } from "../../timeline/use-lyric-cue";
import { createTerminalSession } from "../model/terminal-session";
import styles from "./terminal-line.module.css";

const terminalRows = Array.from({ length: 24 }, (_, index) => `terminal-row-${index}`);

export default function TerminalLineScreen() {
  const { activeWordPosition, wordIndex } = useLyricCue();
  const cueIndex = lyricWordTimings[wordIndex]!.cueIndex;
  const session = createTerminalSession(cueIndex, activeWordPosition);

  return (
    <main className={styles.stage}>
      <section aria-label="Read-only zsh terminal" className={styles.terminal}>
        <header aria-hidden="true" className={styles.titleBar}>
          <span className={styles.windowControls}>
            <i className={styles.close} />
            <i className={styles.minimize} />
            <i className={styles.zoom} />
          </span>
          <span className={styles.title}>7 — zsh</span>
          <span className={styles.titleBalance} />
        </header>

        <div
          aria-label="Terminal transcript"
          aria-live="off"
          className={styles.transcript}
          role="log"
        >
          {terminalRows.map((rowId, index) => {
            const line = session[index];

            return (
              <p
                className={line ? styles.line : styles.emptyLine}
                data-active={line?.active ? "true" : undefined}
                data-kind={line?.kind}
                key={rowId}
              >
                {line?.text}
                {line?.active ? <span aria-hidden="true" className={styles.cursor} /> : null}
              </p>
            );
          })}
        </div>
      </section>
    </main>
  );
}
