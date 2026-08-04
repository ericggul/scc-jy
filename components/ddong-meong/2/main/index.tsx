"use client";

import Link from "next/link";
import { playMeditationSoundtrack } from "../media";
import { meditationContents } from "../model/content-catalog";
import GradientShell from "../surface/gradient-shell";
import styles from "./styles.module.css";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function DdongMeongTwoMain() {
  return (
    <GradientShell>
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.wordmark}>ddong-meong</span>
        </header>

        <div className={styles.body}>
          <section className={styles.introduction}>
            <p className={styles.kicker}>똥멍</p>
            <h1>
              앉아 있는 시간을
              <br />
              비우는 시간으로.
            </h1>
            <p className={styles.description}>
              똥멍은 배변을 기다리는 시간을 몸의 감각과 호흡에
              집중하는 짧은 명상으로 바꿉니다. 모든 세션은 4분 33초 동안
              이어집니다.
            </p>
          </section>

          <section className={styles.playlist} aria-labelledby="playlist-title">
            <h2 id="playlist-title">명상 콘텐츠</h2>
            <div className={styles.contentList}>
              {meditationContents.map((content) => (
                <Link
                  key={content.slug}
                  className={styles.contentCard}
                  href={`/ddong-meong/2/${content.slug}`}
                  onClick={() =>
                    playMeditationSoundtrack({ restart: true })
                  }
                  aria-label={`${content.title}, ${formatDuration(content.durationSeconds)} 재생`}
                >
                  <span
                    className={styles.artwork}
                    style={{ backgroundImage: `url(${content.imagePath})` }}
                    aria-hidden="true"
                  />
                  <span className={styles.cardBody}>
                    <span className={styles.cardCopy}>
                      <strong>{content.title}</strong>
                      <span>{content.description}</span>
                    </span>
                    <span className={styles.cardAction}>
                      <span className={styles.duration}>
                        {formatDuration(content.durationSeconds)}
                      </span>
                      <span className={styles.playIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M9 7.7v8.6L16 12 9 7.7Z" />
                        </svg>
                      </span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </GradientShell>
  );
}
