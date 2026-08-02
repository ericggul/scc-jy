import styles from "./styles.module.css";

export default function SplashPage() {
  return (
    <section className={styles.page}>
      <div className={styles.identity}>
        <h1>ddong-meong</h1>
        <p>똥멍</p>
      </div>
      <p className={styles.message}>
        명상을 하며 쾌적한 대변을 즐겨보세요.
      </p>
    </section>
  );
}
