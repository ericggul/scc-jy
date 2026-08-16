"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { meditationContents } from "../../model/content-catalog";
import { readDdongMeongGreeting } from "../identity";
import { playMeditationSoundtrack } from "../media";
import GradientShell from "../surface/gradient-shell";
import styles from "./styles.module.css";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function subscribeToBrowserGreeting() {
  return () => undefined;
}

function readGreetingMessage() {
  const savedGreeting = readDdongMeongGreeting();
  if (!savedGreeting) return "똥멍";
  return savedGreeting.kind === "first-visit"
    ? `${savedGreeting.nickname}님, 환영합니다!`
    : `${savedGreeting.nickname}님, 또 싸러 오셨군요!`;
}

export default function DdongMeongMain() {
  const greeting = useSyncExternalStore(
    subscribeToBrowserGreeting,
    readGreetingMessage,
    () => "똥멍",
  );

  return (
    <GradientShell>
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.wordmark}>ddong-meong</span>
        </header>

        <div className={styles.body}>
          <section className={styles.introduction}>
            <p className={styles.kicker}>{greeting}</p>
            <h1>
              똥 싸는 시간을
              <br />
              멍때리는 시간으로.
            </h1>
            <p className={styles.description}>
              세상에서 제일 사적인 몇 분을, 조금 구수하게 멍때립니다. 모든
              세션은 4분 33초 동안 이어집니다.
            </p>
          </section>

          <section className={styles.playlist} aria-labelledby="playlist-title">
            <h2 id="playlist-title">오늘의 똥멍 콘텐츠</h2>
            <div className={styles.contentList}>
              {meditationContents.map((content) => (
                <Link
                  key={content.slug}
                  className={styles.contentCard}
                  href={`/${content.slug}`}
                  prefetch={false}
                  aria-label={`${content.title}, ${formatDuration(content.durationSeconds)} 재생`}
                  onClick={() => playMeditationSoundtrack({ restart: true })}
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
