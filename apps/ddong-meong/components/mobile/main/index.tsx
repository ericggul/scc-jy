"use client";

import Link from "next/link";
import { type CSSProperties, useSyncExternalStore } from "react";
import { meditationContents } from "../../model/content-catalog";
import { readDdongMeongGreeting } from "../identity";
import { playMeditationSoundtrack } from "../media";
import GradientShell from "../surface/gradient-shell";
import ContentArtwork from "./content-artwork";
import styles from "./styles.module.css";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function subscribeToBrowserGreeting() {
  return () => undefined;
}

const returningGreetingVariations = [
  "{nickname}님, {count}번째 똥멍을 즐기세요.",
  "{nickname}님, 벌써 {count}번째 똥멍이네요.",
  "{nickname}님, 오늘도 {count}번째로 멍때려요.",
  "{nickname}님, {count}번째 똥멍 시간입니다.",
  "{nickname}님, {count}번째 똥멍도 편안하게 즐기세요.",
] as const;

function readGreetingMessage() {
  const savedGreeting = readDdongMeongGreeting();
  if (!savedGreeting) return "똥멍";
  if (savedGreeting.kind === "first-visit") {
    return `${savedGreeting.nickname}님, 환영합니다!`;
  }
  if (savedGreeting.visitCount === 2) {
    return `${savedGreeting.nickname}님, 또 싸러 오셨군요!`;
  }

  return returningGreetingVariations[savedGreeting.greetingVariant]
    .replace("{nickname}", savedGreeting.nickname)
    .replace("{count}", String(savedGreeting.visitCount));
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
              {meditationContents.map((content, index) => (
                <Link
                  key={content.slug}
                  className={styles.contentCard}
                  href={`/${content.slug}`}
                  prefetch={false}
                  style={
                    { "--content-card-index": index } as CSSProperties
                  }
                  aria-label={`${content.title}, ${formatDuration(content.durationSeconds)} 재생`}
                  onClick={() => playMeditationSoundtrack({ restart: true })}
                >
                  <ContentArtwork src={content.imagePath} eager={index === 0} />
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
