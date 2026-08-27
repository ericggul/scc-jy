"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DdongMeongWordmark from "../../design-system/wordmark";
import { readSavedNickname } from "../identity";
import ContentArtwork from "../main/content-artwork";
import mainStyles from "../main/styles.module.css";
import GradientShell from "../surface/gradient-shell";
import styles from "./styles.module.css";

const totalSeconds = 273;
const kakaoTemplateId = 136302;
const kakaoJavaScriptKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
const kakaoShareBody = "똥싸며 멍때리기, 같이 해볼래요?";

function kakaoShareTitle({
  duration,
  nickname,
  overflowed,
}: {
  duration: string;
  nickname: string;
  overflowed: boolean;
}) {
  return overflowed
    ? `${nickname}님은 똥싸다 변기가 넘쳤어요!`
    : `${nickname}님은 ${duration} 동안 똥쌌어요`;
}

type KakaoSdk = {
  Share?: {
    sendCustom: (options: {
      templateId: number;
      templateArgs?: Record<string, string>;
    }) => void;
    uploadImage: (options: { file: FileList }) => Promise<{
      infos: { original: { url: string } };
    }>;
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

async function uploadImageToKakao(
  imagePath: string,
  share: NonNullable<KakaoSdk["Share"]>,
) {
  const response = await fetch(imagePath);
  if (!response.ok) {
    throw new Error("대표 이미지를 불러오지 못했습니다.");
  }

  const image = await response.blob();
  if (image.size > 5 * 1024 * 1024) {
    throw new Error("대표 이미지가 카카오 업로드 제한(5MB)을 넘습니다.");
  }

  const sourceUrl = new URL(imagePath, window.location.origin);
  const filename = sourceUrl.pathname.split("/").at(-1) || "ddong-meong.png";
  const file = new File([image], filename, {
    type: image.type || "image/png",
  });
  const transfer = new DataTransfer();
  transfer.items.add(file);
  const uploaded = await share.uploadImage({ file: transfer.files });
  const imageUrl = uploaded.infos.original.url;
  if (!imageUrl) {
    throw new Error("카카오 이미지 URL을 받지 못했습니다.");
  }
  return imageUrl;
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
  duration,
  elapsedClock,
  imagePath,
}: {
  contentTitle: string;
  duration: string;
  elapsedClock: string;
  imagePath: string;
}) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 만들 수 없습니다.");

  const canvasField = context.createLinearGradient(0, 0, 1080, 1920);
  canvasField.addColorStop(0, "#211814");
  canvasField.addColorStop(0.38, "#432c22");
  canvasField.addColorStop(0.7, "#795536");
  canvasField.addColorStop(1, "#30211b");
  context.fillStyle = canvasField;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const leftLight = context.createRadialGradient(108, 190, 0, 108, 190, 500);
  leftLight.addColorStop(0, "rgba(157, 108, 58, .76)");
  leftLight.addColorStop(1, "rgba(157, 108, 58, 0)");
  context.fillStyle = leftLight;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const rightLight = context.createRadialGradient(900, 1040, 0, 900, 1040, 660);
  rightLight.addColorStop(0, "rgba(119, 73, 42, .54)");
  rightLight.addColorStop(1, "rgba(119, 73, 42, 0)");
  context.fillStyle = rightLight;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const wordmark = await loadImage("/wordmarks/ddong-meong.png");
  context.drawImage(wordmark, 160, 559.3, 334.1, 72.7);

  const image = await loadImage(imagePath);
  context.save();
  context.beginPath();
  context.roundRect(160, 673, 760, 574, 30);
  context.clip();
  context.fillStyle = "#f5ede7";
  context.fillRect(160, 673, 760, 574);
  drawCoverImage(context, image, 160, 673, 760, 434);
  context.restore();

  context.fillStyle = "#30231e";
  context.font = "630 38px Pretendard, Arial, sans-serif";
  context.fillText(contentTitle, 202, 1160);
  context.fillStyle = "rgba(48, 35, 30, .64)";
  context.font = "450 26px Pretendard, Arial, sans-serif";
  context.fillText(`${duration} 동안 똥멍했어요.`, 202, 1205);
  context.textAlign = "right";
  context.fillStyle = "rgba(48, 35, 30, .62)";
  context.font = "620 25px Pretendard, Arial, sans-serif";
  context.fillText(`${elapsedClock} / 04:33`, 876, 1196);
  context.textAlign = "center";
  context.fillStyle = "rgba(241, 231, 225, .82)";
  context.font = "500 31px Pretendard, Arial, sans-serif";
  context.fillText("똥싸고 멍때리기, 같이 해보실래요?", 540, 1320);
  context.textAlign = "left";

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
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState("당신");
  const [notice, setNotice] = useState<string>();
  const [isPreparingKakao, setIsPreparingKakao] = useState(false);
  const [isPreparingStory, setIsPreparingStory] = useState(false);
  const elapsedSeconds = Number(searchParams.get("seconds")) || totalSeconds;
  const elapsedClock = formatClock(elapsedSeconds);
  const duration = formatDuration(elapsedSeconds);
  const contentTitle = searchParams.get("content") || "오늘의 똥멍";
  const imagePath = searchParams.get("image") || "/meditations/thick-poop-imagination.png";
  const overflowed = searchParams.get("outcome") === "overflowed";
  const shareTitle = kakaoShareTitle({ duration, nickname, overflowed });

  useEffect(() => {
    setNickname(readSavedNickname() ?? "당신");
  }, []);

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
    window.location.assign("/main");
  }

  async function shareToKakao() {
    setIsPreparingKakao(true);
    setNotice(undefined);
    try {
      initializeKakao();
      if (!window.Kakao?.Share) {
        throw new Error("Kakao.Share 모듈을 찾지 못했습니다.");
      }
      const share = window.Kakao.Share;
      const uploadedImageUrl = await uploadImageToKakao(imagePath, share);
      console.info("[ddong-meong:kakao] sendCustom requested", {
        templateArgs: ["TITLE", "BODY", "IMG"],
        templateId: kakaoTemplateId,
      });
      share.sendCustom({
        templateId: kakaoTemplateId,
        templateArgs: {
          BODY: kakaoShareBody,
          IMG: uploadedImageUrl,
          TITLE: shareTitle,
        },
      });
    } catch (error) {
      const message = describeError(error);
      console.error("[ddong-meong:kakao] share failed", error);
      setNotice(`카카오톡 공유 오류: ${message}`);
    } finally {
      setIsPreparingKakao(false);
    }
  }

  async function shareToInstagram() {
    setIsPreparingStory(true);
    setNotice(undefined);
    try {
      const image = await createStoryImage({
        contentTitle,
        duration,
        elapsedClock,
        imagePath,
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
          <DdongMeongWordmark className={mainStyles.wordmark} />
          <button aria-label="메인으로 돌아가기" className={styles.closeButton} onClick={returnToMain} type="button">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>

        <main className={styles.main}>
          <section className={`${mainStyles.introduction} ${styles.introduction}`}>
            <h1>{overflowed ? <><span>{nickname}님,</span> 변기가 넘쳤어요!</> : `${nickname}님, 잘 비웠어요.`}</h1>
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
          <p className={styles.sharePrompt}>똥멍 메이트 구하기 💩</p>
          <button aria-label="카카오톡으로 공유" className={`${styles.shareButton} ${styles.kakaoButton}`} disabled={isPreparingKakao} onClick={shareToKakao} type="button">
            <KakaoTalkIcon />
            <span>{isPreparingKakao ? "카카오톡 공유 준비 중" : "카카오톡으로 공유"}</span>
          </button>
          <button aria-label="인스타그램 스토리용 이미지 만들기" className={`${styles.shareButton} ${styles.instagramButton}`} disabled={isPreparingStory} onClick={shareToInstagram} type="button">
            <InstagramIcon />
            <span>{isPreparingStory ? "스토리 카드 만드는 중" : "인스타그램 스토리 만들기"}</span>
          </button>
          {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
        </div>

        <div className={styles.returnArea}>
          <button className={styles.returnButton} onClick={returnToMain} type="button">
            다른 똥멍하러 가기
          </button>
        </div>
      </section>
    </GradientShell>
  );
}
