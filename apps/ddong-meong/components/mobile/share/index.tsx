"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readSavedNickname } from "../identity";
import ContentArtwork from "../main/content-artwork";
import mainStyles from "../main/styles.module.css";
import GradientShell from "../surface/gradient-shell";
import styles from "./styles.module.css";

const totalSeconds = 273;
const returnDelayMs = 50_000;
const kakaoTemplateId = 136302;
const kakaoJavaScriptKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

type KakaoSdk = {
  Share?: {
    sendCustom: (options: {
      templateId: number;
      templateArgs?: Record<string, string>;
    }) => void;
  };
  init: (key: string) => void;
  isInitialized: () => boolean;
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

function formatClock(seconds: number) {
  const safeSeconds = Math.max(1, Math.min(totalSeconds, Math.round(seconds)));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(
    safeSeconds % 60,
  ).padStart(2, "0")}`;
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(1, Math.min(totalSeconds, Math.round(seconds)));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return remainder === 0 ? `${minutes}분` : `${minutes}분 ${remainder}초`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("대표 이미지를 불러올 수 없습니다."));
    image.src = src;
  });
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const frameRatio = width / height;
  const sourceWidth = imageRatio > frameRatio
    ? image.naturalHeight * frameRatio
    : image.naturalWidth;
  const sourceHeight = imageRatio > frameRatio
    ? image.naturalHeight
    : image.naturalWidth / frameRatio;

  context.drawImage(
    image,
    (image.naturalWidth - sourceWidth) / 2,
    (image.naturalHeight - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

async function createStoryImage({
  contentTitle,
  elapsedClock,
  imagePath,
  nickname,
}: {
  contentTitle: string;
  elapsedClock: string;
  imagePath: string;
  nickname: string;
}) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 만들 수 없습니다.");

  const background = context.createLinearGradient(0, 0, 1080, 1920);
  background.addColorStop(0, "#211814");
  background.addColorStop(0.4, "#432c22");
  background.addColorStop(0.72, "#795536");
  background.addColorStop(1, "#30211b");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const warmLight = context.createRadialGradient(110, 120, 0, 110, 120, 920);
  warmLight.addColorStop(0, "rgba(157, 108, 58, .84)");
  warmLight.addColorStop(1, "rgba(157, 108, 58, 0)");
  context.fillStyle = warmLight;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#f1e7e1";
  context.font = '400 72px "Snell Roundhand", "Brush Script MT", cursive';
  context.fillText("ddong-meong", 92, 160);
  context.font = "560 88px Pretendard, Arial, sans-serif";
  context.fillText(`${nickname}님,`, 88, 332);
  context.fillText("잘 비웠어요.", 88, 436);

  const image = await loadImage(imagePath);
  context.save();
  context.beginPath();
  context.roundRect(88, 548, 904, 508, 27);
  context.clip();
  drawCoverImage(context, image, 88, 548, 904, 508);
  context.restore();

  context.fillStyle = "rgba(241, 231, 225, .72)";
  context.font = "500 34px Pretendard, Arial, sans-serif";
  context.fillText(contentTitle, 88, 1135);
  context.fillStyle = "#f1e7e1";
  context.font = "620 74px Pretendard, Arial, sans-serif";
  context.fillText(`${elapsedClock}  /  04:33`, 88, 1264);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("이미지를 만들 수 없습니다."));
    }, "image/png");
  });
}

function KakaoTalkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3.45c-5.25 0-9.5 3.32-9.5 7.42 0 2.68 1.8 5.03 4.51 6.35l-.92 3.5 4.07-2.67c.6.09 1.21.13 1.84.13 5.25 0 9.5-3.32 9.5-7.31S17.25 3.45 12 3.45Z" />
      <circle cx="8" cy="10.8" fill="#fee500" r=".83" />
      <circle cx="12" cy="10.8" fill="#fee500" r=".83" />
      <circle cx="16" cy="10.8" fill="#fee500" r=".83" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect height="14" rx="4" width="14" x="5" y="5" />
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="16.2" cy="7.85" fill="currentColor" r=".88" stroke="none" />
    </svg>
  );
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류";
}

export default function DdongMeongShare() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState("당신");
  const [notice, setNotice] = useState<string>();
  const [isPreparingStory, setIsPreparingStory] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.ceil(returnDelayMs / 1000),
  );
  const elapsedSeconds = Number(searchParams.get("seconds")) || totalSeconds;
  const elapsedClock = formatClock(elapsedSeconds);
  const duration = formatDuration(elapsedSeconds);
  const contentTitle = searchParams.get("content") || "오늘의 똥멍";
  const imagePath = searchParams.get("image") || "/meditations/thick-poop-imagination.png";
  const shareMessage = `${nickname}님, ${contentTitle}과 함께 ${duration} 동안 똥멍했어요. 여러분도 똥멍해보세요.`;

  useEffect(() => {
    setNickname(readSavedNickname() ?? "당신");
    const deadline = Date.now() + returnDelayMs;
    const updateRemainingSeconds = () => {
      setRemainingSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    };
    const interval = window.setInterval(updateRemainingSeconds, 250);
    const timer = window.setTimeout(() => router.replace("/main"), returnDelayMs);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [router]);

  function initializeKakao() {
    if (!kakaoJavaScriptKey) {
      throw new Error("NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY를 읽지 못했습니다.");
    }
    if (!window.Kakao) {
      throw new Error("Kakao JavaScript SDK가 아직 로드되지 않았습니다.");
    }
    if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoJavaScriptKey);
    console.info("[ddong-meong:kakao] SDK initialized", {
      templateId: kakaoTemplateId,
    });
  }

  function handleKakaoScriptLoad() {
    try {
      initializeKakao();
      console.info("[ddong-meong:kakao] SDK script loaded");
    } catch (error) {
      console.error("[ddong-meong:kakao] SDK initialization failed", error);
    }
  }

  function handleKakaoScriptError() {
    console.error("[ddong-meong:kakao] SDK script failed to load");
  }

  function returnToMain() {
    router.replace("/main");
  }

  function shareToKakao() {
    try {
      initializeKakao();
      if (!window.Kakao?.Share) {
        throw new Error("Kakao.Share 모듈을 찾지 못했습니다.");
      }
      console.info("[ddong-meong:kakao] sendCustom requested", {
        templateArgs: ["TITLE", "BODY"],
        templateId: kakaoTemplateId,
      });
      window.Kakao.Share.sendCustom({
        templateId: kakaoTemplateId,
        templateArgs: {
          BODY: shareMessage,
          TITLE: "똥멍 같이 해볼래요?",
        },
      });
    } catch (error) {
      const message = describeError(error);
      console.error("[ddong-meong:kakao] share failed", error);
      setNotice(`카카오톡 공유 오류: ${message}`);
    }
  }

  async function shareToInstagram() {
    setIsPreparingStory(true);
    setNotice(undefined);
    try {
      const image = await createStoryImage({
        contentTitle,
        elapsedClock,
        imagePath,
        nickname,
      });
      const file = new File([image], "ddong-meong-story.png", { type: "image/png" });
      const shareData = { files: [file], title: "똥멍" };
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        setNotice("스토리에 올릴 앱을 골라주세요.");
      } else {
        const url = URL.createObjectURL(image);
        const link = document.createElement("a");
        link.href = url;
        link.download = "ddong-meong-story.png";
        link.click();
        URL.revokeObjectURL(url);
        setNotice("스토리용 카드를 저장했어요. 인스타그램 스토리에서 골라 올려주세요.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setNotice("카드를 만들지 못했어요. 한 번 더 눌러주세요.");
      }
    } finally {
      setIsPreparingStory(false);
    }
  }

  return (
    <GradientShell>
      <section className={styles.page} aria-label="똥멍 완료 및 공유 화면">
        <Script
          crossOrigin="anonymous"
          onError={handleKakaoScriptError}
          onLoad={handleKakaoScriptLoad}
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js"
          strategy="afterInteractive"
        />
        <header className={`${mainStyles.header} ${styles.header}`}>
          <span className={mainStyles.wordmark}>ddong-meong</span>
          <button aria-label="메인으로 돌아가기" className={styles.closeButton} onClick={returnToMain} type="button">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>

        <main className={styles.main}>
          <section className={`${mainStyles.introduction} ${styles.introduction}`}>
            <h1><span>{nickname}님,</span>잘 비웠어요.</h1>
          </section>
          <article className={`${mainStyles.contentCard} ${styles.completedCard}`}>
            <ContentArtwork eager src={imagePath} />
            <div className={mainStyles.cardBody}>
              <div className={mainStyles.cardCopy}>
                <strong>{contentTitle}</strong>
                <span>{duration} 동안 똥멍했어요.</span>
              </div>
              <time className={mainStyles.duration}>{elapsedClock} / 04:33</time>
            </div>
          </article>
        </main>

        <div className={styles.actions}>
          <button aria-label="카카오톡으로 공유" className={`${styles.shareButton} ${styles.kakaoButton}`} onClick={shareToKakao} type="button">
            <KakaoTalkIcon />
            <span>카카오톡으로 공유</span>
          </button>
          <button aria-label="인스타그램 스토리용 이미지 만들기" className={`${styles.shareButton} ${styles.instagramButton}`} disabled={isPreparingStory} onClick={shareToInstagram} type="button">
            <InstagramIcon />
            <span>{isPreparingStory ? "스토리 카드 만드는 중" : "인스타그램 스토리 만들기"}</span>
          </button>
          {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
        </div>

        <div className={styles.returnArea}>
          <button className={styles.returnButton} onClick={returnToMain} type="button">
            다른 똥멍 고르기
          </button>
          <p>{remainingSeconds}초 후에 메인으로 돌아갑니다.</p>
        </div>
      </section>
    </GradientShell>
  );
}
