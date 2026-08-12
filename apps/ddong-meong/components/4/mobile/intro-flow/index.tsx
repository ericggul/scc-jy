import NicknamePage from "../nickname-page";
import SplashPage from "../splash-page";
import styles from "./styles.module.css";

type IntroStage = "splash" | "nickname" | "nickname-exit" | "returning-exit";

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
  const isExiting = stage === "nickname-exit" || stage === "returning-exit";
  const isNicknameStage = stage === "nickname" || stage === "nickname-exit";

  return (
    <div
      className={`${styles.flow} ${isExiting ? styles.exiting : ""}`}
    >
      <div className={styles.content}>
        {isNicknameStage ? (
          <NicknamePage
            nickname={nickname}
            exiting={isExiting}
            onNicknameChange={onNicknameChange}
            onContinue={onContinue}
          />
        ) : (
          <SplashPage />
        )}
      </div>
    </div>
  );
}
