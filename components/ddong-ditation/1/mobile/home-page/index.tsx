import styles from "./styles.module.css";

type HomePageProps = {
  connected: boolean;
  connectionError: string | null;
  onBegin: () => void;
};

export default function HomePage({
  connected,
  connectionError,
  onBegin,
}: HomePageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.photoShade} />
      <div className={styles.home}>
        <header className={styles.header}>
          <span className={styles.wordmark}>ddong-ditation</span>
          <button type="button" className={styles.profile} aria-label="프로필">
            <span />
          </button>
        </header>

        <section className={styles.intro}>
          <p>좋은 아침이에요</p>
          <h1>잠시 앉아, 가볍게 비워보세요.</h1>
        </section>

        <section className={styles.daily}>
          <div className={styles.dailyImage} aria-hidden="true" />
          <div className={styles.dailyContent}>
            <div>
              <span>DAILY DDONG</span>
              <h2>가볍게 비우기</h2>
              <p>3분 · 힘을 빼는 명상</p>
            </div>
            <button
              type="button"
              onClick={onBegin}
              disabled={!connected}
              aria-label="가볍게 비우기 시작"
            >
              {connected ? "▶" : "…"}
            </button>
          </div>
        </section>

        {connectionError ? (
          <p className={styles.error}>
            전시 화면과 연결하지 못했습니다. 잠시 후 다시 열어주세요.
          </p>
        ) : null}

        <nav className={styles.nav} aria-label="주요 메뉴">
          <button
            type="button"
            className={styles.activeNav}
            aria-current="page"
          >
            <span aria-hidden="true">⌂</span>
            홈
          </button>
          <button type="button">
            <span aria-hidden="true">☾</span>
            수면
          </button>
          <button type="button">
            <span aria-hidden="true">◯</span>
            명상
          </button>
          <button type="button">
            <span aria-hidden="true">♫</span>
            음악
          </button>
        </nav>
      </div>
    </main>
  );
}
