import type { FormEvent } from "react";
import styles from "./styles.module.css";

type NicknamePageProps = {
  nickname: string;
  exiting: boolean;
  onNicknameChange: (nickname: string) => void;
  onContinue: () => void;
};

export default function NicknamePage({
  nickname,
  exiting,
  onNicknameChange,
  onContinue,
}: NicknamePageProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onContinue();
  }

  return (
    <section className={styles.page}>
      <span className={styles.wordmark}>ddong-meong</span>

      <div className={styles.body}>
        <h1>어떻게 불러드릴까요?</h1>
        <p>명상 중 사용할 닉네임을 입력해주세요.</p>

        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="ddong-meong-3-nickname">닉네임</label>
          <input
            id="ddong-meong-3-nickname"
            name="nickname"
            type="text"
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            disabled={exiting}
            maxLength={16}
            autoComplete="nickname"
            autoFocus
            placeholder="노라조"
          />
          <button type="submit" disabled={exiting || !nickname.trim()}>
            계속
          </button>
        </form>
      </div>
    </section>
  );
}
