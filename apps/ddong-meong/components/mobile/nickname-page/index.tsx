import type { FormEvent } from "react";
import DdongMeongWordmark from "../../design-system/wordmark";
import styles from "./styles.module.css";

type NicknamePageProps = {
  nickname: string;
  exiting: boolean;
  onNicknameChange: (nickname: string) => void;
  onContinue: () => void;
};

function isHangulNickname(value: string) {
  return /^[ㄱ-ㅎㅏ-ㅣ가-힣\s]+$/u.test(value.trim());
}

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
      <DdongMeongWordmark className={styles.wordmark} />

      <div className={styles.body}>
        <h1>어떻게 불러드릴까요?</h1>
        <p>똥멍 중 사용할 닉네임을 입력해주세요.</p>

        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="ddong-meong-nickname">닉네임</label>
          <div className={styles.nicknameField}>
            <input
              id="ddong-meong-nickname"
              name="nickname"
              type="text"
              lang="ko"
              inputMode="text"
              value={nickname}
              onChange={(event) => onNicknameChange(event.target.value)}
              disabled={exiting}
              maxLength={16}
              autoComplete="nickname"
              autoFocus
              placeholder="홍길똥"
            />
            {isHangulNickname(nickname) ? <p>실명 입력은 삼가주세요.</p> : null}
          </div>
          <button type="submit" disabled={exiting || !nickname.trim()}>
            계속
          </button>
        </form>
      </div>
    </section>
  );
}
