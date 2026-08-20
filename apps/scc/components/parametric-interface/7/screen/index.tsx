"use client";

import { useLyricCue } from "../../timeline/use-lyric-cue";
import styles from "./lecture-note.module.css";

const lecturePages = [
  ["Overview", "Parameters of the Low-Energy Model"],
  ["Degrees of freedom", "Degrees of freedom"],
  ["Quantization", "Quantization"],
  ["Spectrum and response", "Spectrum and response"],
  ["Consistency checks", "Consistency checks"],
  ["Example", "Example"],
  ["Low-Energy Model", "Low-Energy Model"],
  ["Summary", "Summary"],
  ["Quantum Gravitation", "Quantum Gravitation"],
] as const;

function LecturePage({ section, title, word }: { section: string; title: string; word: string }) {
  return (
    <article aria-label={`${section} lecture page`} className={styles.page}>
      <header className={styles.header}>
        <span>{section}</span>
        <strong>Quantum Gravitation</strong>
      </header>
      <div className={styles.body}>
        <h2><span aria-hidden="true">■</span>{title}</h2>
        <p aria-live="off" className={styles.parameter}>{word}</p>
      </div>
    </article>
  );
}

export default function LectureNoteScreen() {
  const { currentWord } = useLyricCue();

  return (
    <main aria-label="Nine synchronized PH45130 lecture notes" className={styles.grid}>
      {lecturePages.map(([section, title], index) => (
        <LecturePage key={`lecture-page-${index + 1}`} section={section} title={title} word={currentWord} />
      ))}
    </main>
  );
}
