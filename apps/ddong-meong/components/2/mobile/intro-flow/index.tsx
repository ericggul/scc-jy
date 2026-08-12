import NicknamePage from "../nickname-page";
import SplashPage from "../splash-page";
import styles from "./styles.module.css";

type IntroStage = "splash" | "nickname" | "nickname-exit";

type IntroFlowProps = {
  stage: IntroStage;
  nickname: string;
  onNicknameChange: (nickname: string) => void;
  onContinue: () => void;
};

export default function IntroFlow({
  stage,
  nickname,
  onNicknameChange,
  onContinue,
}: IntroFlowProps) {
  const isExiting = stage === "nickname-exit";

  return (
    <div
      className={`${styles.flow} ${isExiting ? styles.exiting : ""}`}
    >
      <div className={styles.content}>
        {stage === "splash" ? (
          <SplashPage />
        ) : (
          <NicknamePage
            nickname={nickname}
            exiting={isExiting}
            onNicknameChange={onNicknameChange}
            onContinue={onContinue}
          />
        )}
      </div>
    </div>
  );
}
