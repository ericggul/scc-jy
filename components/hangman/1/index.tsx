"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./hangman.module.css";

const MAX_MISTAKES = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const WORDS = [
  { id: "afterimage", word: "AFTERIMAGE", clue: "A picture that lingers after the source is gone" },
  { id: "parallax", word: "PARALLAX", clue: "An apparent shift caused by a change in viewpoint" },
  { id: "resonance", word: "RESONANCE", clue: "A vibration strengthened by another at the same frequency" },
  { id: "threshold", word: "THRESHOLD", clue: "The point where one state begins to become another" },
  { id: "silhouette", word: "SILHOUETTE", clue: "A form read only by its outline" },
  { id: "interval", word: "INTERVAL", clue: "The space or time separating two things" },
] as const;

type RoundState = "playing" | "won" | "lost";

function HangmanDrawing({ mistakes }: { mistakes: number }) {
  const parts = [
    <circle key="head" className={styles.figureLine} cx="193" cy="83" r="23" />,
    <path key="body" className={styles.figureLine} d="M193 106v78" />,
    <path key="left-arm" className={styles.figureLine} d="m193 128-38 34" />,
    <path key="right-arm" className={styles.figureLine} d="m193 128 38 34" />,
    <path key="left-leg" className={styles.figureLine} d="m193 184-34 52" />,
    <path key="right-leg" className={styles.figureLine} d="m193 184 34 52" />,
  ];

  return (
    <svg
      className={styles.drawing}
      viewBox="0 0 280 280"
      role="img"
      aria-label={`Hangman drawing with ${mistakes} of ${MAX_MISTAKES} parts`}
    >
      <path className={styles.gallows} d="M31 257h208M61 257V25h132v34M61 55l30-30" />
      <path className={styles.rope} d="M193 25v35" />
      {parts.slice(0, mistakes)}
    </svg>
  );
}

export default function HangmanOne() {
  const [wordIndex, setWordIndex] = useState(0);
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const current = WORDS[wordIndex];

  const wrongLetters = useMemo(
    () => guessedLetters.filter((letter) => !current.word.includes(letter)),
    [current.word, guessedLetters],
  );
  const uniqueLetters = useMemo(
    () => new Set(current.word.split("")),
    [current.word],
  );
  const hasWon = [...uniqueLetters].every((letter) => guessedLetters.includes(letter));
  const hasLost = wrongLetters.length >= MAX_MISTAKES;
  const roundState: RoundState = hasWon ? "won" : hasLost ? "lost" : "playing";
  const remaining = MAX_MISTAKES - wrongLetters.length;

  const chooseLetter = useCallback(
    (letter: string) => {
      if (roundState !== "playing") return;
      setGuessedLetters((letters) =>
        letters.includes(letter) ? letters : [...letters, letter],
      );
    },
    [roundState],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const letter = event.key.toUpperCase();
      if (/^[A-Z]$/.test(letter)) chooseLetter(letter);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chooseLetter]);

  function startNextRound() {
    setWordIndex((index) => (index + 1) % WORDS.length);
    setGuessedLetters([]);
  }

  const statusMessage =
    roundState === "won"
      ? "You found it."
      : roundState === "lost"
        ? `The word was ${current.word}.`
        : `${remaining} wrong ${remaining === 1 ? "guess" : "guesses"} left.`;

  return (
    <main className={styles.page}>
      <section className={styles.game} aria-labelledby="hangman-title">
        <header className={styles.header}>
          <h1 id="hangman-title" className={styles.title}>Hangman</h1>
          <p className={styles.status} aria-live="polite">{statusMessage}</p>
        </header>

        <div className={styles.playArea}>
          <div className={styles.drawingPanel}>
            <HangmanDrawing mistakes={wrongLetters.length} />
          </div>

          <div className={styles.puzzlePanel}>
            <p className={styles.clue}><span>Clue</span>{current.clue}</p>

            <div className={styles.word} aria-label={`Word with ${current.word.length} letters`}>
              {current.word.split("").map((letter, index) => {
                const isVisible = guessedLetters.includes(letter) || hasLost;
                return (
                  <span className={styles.letterSlot} key={`${current.id}-${index}`}>
                    <span className={isVisible ? styles.letterVisible : styles.letterHidden}>
                      {letter}
                    </span>
                  </span>
                );
              })}
            </div>

            {roundState === "playing" ? (
              <div className={styles.keyboard} aria-label="Letter keyboard">
                {ALPHABET.map((letter) => {
                  const hasBeenGuessed = guessedLetters.includes(letter);
                  const wasCorrect = hasBeenGuessed && current.word.includes(letter);
                  const wasWrong = hasBeenGuessed && !wasCorrect;
                  return (
                    <button
                      className={styles.key}
                      data-correct={wasCorrect || undefined}
                      data-wrong={wasWrong || undefined}
                      disabled={hasBeenGuessed}
                      key={letter}
                      onClick={() => chooseLetter(letter)}
                      type="button"
                      aria-label={hasBeenGuessed ? `${letter}, already guessed` : `Guess ${letter}`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            ) : (
              <button className={styles.nextButton} onClick={startNextRound} type="button">
                Next word <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
