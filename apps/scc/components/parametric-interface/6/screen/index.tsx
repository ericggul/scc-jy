"use client";

import { useEffect, useState } from "react";
import { useLyricCue } from "../../timeline/use-lyric-cue";
import {
  createTerminalSession,
  type TerminalSessionLine,
} from "../model/terminal-session";
import styles from "./terminal-line.module.css";

const terminalRows = Array.from({ length: 24 }, (_, index) => `terminal-row-${index}`);

function typingDuration(word: string, wordDurationMs: number) {
  return Math.min(
    Math.max(80, word.length * 28),
    Math.max(80, wordDurationMs * 0.55),
  );
}

function typedCharacterCount(
  elapsedMs: number,
  word: string,
  wordDurationMs: number,
) {
  const durationMs = typingDuration(word, wordDurationMs);
  return Math.min(
    word.length,
    Math.max(0, Math.floor((Math.max(0, elapsedMs) / durationMs) * word.length)),
  );
}

function useTypedWord(
  word: string,
  wordStartMs: number,
  wordDurationMs: number,
  currentTimeMs: number,
  isPlaying: boolean,
  reducedMotion: boolean,
) {
  const [typedLength, setTypedLength] = useState(word.length);

  useEffect(() => {
    const initialLength = typedCharacterCount(
      currentTimeMs - wordStartMs,
      word,
      wordDurationMs,
    );

    if (!isPlaying || reducedMotion || initialLength === word.length) {
      setTypedLength(word.length);
      return;
    }

    const startedAt = performance.now() - (currentTimeMs - wordStartMs);
    let frameId = 0;

    const update = () => {
      const nextLength = typedCharacterCount(
        performance.now() - startedAt,
        word,
        wordDurationMs,
      );
      setTypedLength(nextLength);

      if (nextLength < word.length) {
        frameId = window.requestAnimationFrame(update);
      }
    };

    setTypedLength(initialLength);
    frameId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frameId);
  }, [currentTimeMs, isPlaying, reducedMotion, word, wordDurationMs, wordStartMs]);

  return word.slice(0, typedLength);
}

function renderLine(line: TerminalSessionLine | undefined, typedWord: string) {
  if (!line?.active || !line.activeWord) return line?.text;

  const activeWordStart = line.text.lastIndexOf(line.activeWord);
  if (activeWordStart < 0) return line.text;

  const activeWordEnd = activeWordStart + line.activeWord.length;
  const isTypingComplete = typedWord.length === line.activeWord.length;

  return (
    <>
      {line.text.slice(0, activeWordStart)}
      <span aria-label={line.activeWord} className={styles.activeWord}>
        <span aria-hidden="true" className={styles.typedWord}>
          {typedWord}
          {!isTypingComplete ? <span className={styles.cursor} /> : null}
        </span>
        <span aria-hidden="true" className={styles.untypedWord}>
          {line.activeWord.slice(typedWord.length)}
        </span>
      </span>
      {line.text.slice(activeWordEnd)}
      {isTypingComplete ? <span aria-hidden="true" className={styles.cursor} /> : null}
    </>
  );
}

export default function TerminalLineScreen() {
  const {
    activeWordPosition,
    cueIndex,
    currentTimeMs,
    currentWord,
    isPlaying,
    lyricCues,
    reducedMotion,
    wordIndex,
    wordTimings,
  } = useLyricCue();
  const currentTiming = wordTimings[wordIndex]!;
  const typedWord = useTypedWord(
    currentWord.toUpperCase(),
    currentTiming.startMs,
    currentTiming.durationMs,
    currentTimeMs,
    isPlaying,
    reducedMotion,
  );
  const session = createTerminalSession(lyricCues, cueIndex, activeWordPosition);

  return (
    <main className={styles.stage}>
      <section aria-label="Read-only zsh terminal" className={styles.terminal}>
        <header aria-hidden="true" className={styles.titleBar}>
          <span className={styles.windowControls}>
            <i className={styles.close} />
            <i className={styles.minimize} />
            <i className={styles.zoom} />
          </span>
          <span className={styles.title}>6 — zsh</span>
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
                {renderLine(line, typedWord)}
              </p>
            );
          })}
        </div>
      </section>
    </main>
  );
}
