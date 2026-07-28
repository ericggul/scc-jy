import type { DdongDitationPhase } from "../../model/types";
import styles from "./styles.module.css";

type SessionPageProps = {
  phase: Exclude<DdongDitationPhase, "complete">;
  instruction: string;
  cycleCount: number;
  onFinish: () => void;
};

export default function SessionPage({
  phase,
  instruction,
  cycleCount,
  onFinish,
}: SessionPageProps) {
  return (
    <main className={styles.player}>
      <div className={styles.photoShade} />
      <header className={styles.playerHeader}>
        <button type="button" onClick={onFinish} aria-label="명상 닫기">
          ×
        </button>
        <span>Daily Ddong</span>
      </header>

      <section className={styles.playerBody} aria-live="polite">
        <div className={`${styles.breathOrb} ${styles[phase]}`} />
        <p>{instruction}</p>
        <h1>가볍게 비우기</h1>
        <span>{cycleCount + 1}번째 호흡</span>
      </section>

      <button
        type="button"
        className={styles.finishButton}
        onClick={onFinish}
      >
        명상 마치기
      </button>
    </main>
  );
}
