import styles from "./styles.module.css";

export default function SplashPage() {
  return (
    <section className={styles.page}>
      <div className={styles.identity}>
        <h1>ddong-meong</h1>
        <p>똥멍</p>
      </div>
      <p className={styles.message}>
        똥 싸는 시간을 잠깐 멍때려보세요.
      </p>
    </section>
  );
}
