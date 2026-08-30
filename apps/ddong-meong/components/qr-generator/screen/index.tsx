"use client";

import { useEffect, useMemo, useState } from "react";
import { ddongMeongSans } from "@/components/design-system/fonts";
import {
  createDdongMeongQrSvg,
  DdongMeongQrCode,
} from "@/components/screen/entry-qr";
import {
  buildQrPosterEntryUrl,
  cValMobileEntryUrl,
  qrPosterParametersToQuery,
  type QrPosterParameters,
  type QrPosterProject,
} from "../model/parameters";
import styles from "./styles.module.css";

type QrPosterGeneratorProps = {
  initialParameters: QrPosterParameters;
};

type PosterCopy = {
  id: "invitation" | "duration" | "private-minutes";
  label: string;
  lines: readonly string[];
};

const posterProjects = [
  { id: "ddong-meong", label: "똥멍" },
  { id: "c-val", label: "C-VAL" },
] as const satisfies readonly { id: QrPosterProject; label: string }[];

const posterCopies = [
  {
    id: "invitation",
    label: "추천 · 똥 싸는 동안, 잠깐 멍때려보세요.",
    lines: ["똥 싸는 동안,", "잠깐 멍때려보세요."],
  },
  {
    id: "duration",
    label: "지금, 4분 33초만 멍때려요.",
    lines: ["지금, 4분 33초만", "멍때려요."],
  },
  {
    id: "private-minutes",
    label: "오늘의 가장 사적인 몇 분을, 똥멍하세요.",
    lines: ["오늘의 가장 사적인 몇 분을,", "똥멍하세요."],
  },
] as const satisfies readonly PosterCopy[];

const cValPosterCopy = {
  lines: ["QR 스캔 후", "휴대폰을 돌려보세요."],
  supportingLine: "V/A/L 값이 바뀌며 주가가 움직입니다.",
} as const;

function updateParameter(
  parameters: QrPosterParameters,
  key: keyof QrPosterParameters,
  value: string,
) {
  return { ...parameters, [key]: value } as QrPosterParameters;
}

export default function QrPosterGenerator({
  initialParameters,
}: QrPosterGeneratorProps) {
  const [parameters, setParameters] = useState(initialParameters);
  const [copyId, setCopyId] = useState<PosterCopy["id"]>("invitation");
  const [copyStatus, setCopyStatus] = useState("");
  const isDdongMeong = parameters.project === "ddong-meong";
  const entryUrl = useMemo(
    () =>
      isDdongMeong
        ? buildQrPosterEntryUrl(parameters)
        : cValMobileEntryUrl,
    [isDdongMeong, parameters],
  );
  const selectedCopy = posterCopies.find((copy) => copy.id === copyId)!;

  useEffect(() => {
    const query = qrPosterParametersToQuery(parameters);
    window.history.replaceState(null, "", `/qr-generator?${query}`);
  }, [parameters]);

  async function copyEntryUrl() {
    try {
      await navigator.clipboard.writeText(entryUrl);
      setCopyStatus("QR 대상 주소를 복사했습니다.");
    } catch {
      setCopyStatus("주소 복사에 실패했습니다. 아래 주소를 직접 복사하세요.");
    }
  }

  function downloadCValQrSvg() {
    const svg = createDdongMeongQrSvg(cValMobileEntryUrl, {
      title: "C-VAL mobile entry QR",
      description: cValMobileEntryUrl,
    });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "c-val-mobile-entry-qr.svg";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
    setCopyStatus("C-VAL QR SVG를 내려받았습니다.");
  }

  const eyebrow = isDdongMeong ? "똥멍 캠퍼스 QR" : "C-VAL 설치 입구";
  const introduction = isDdongMeong
    ? "건물 하나당 한 장씩 인쇄하세요. QR은 해당 건물의 맥락만 세션에 전달합니다."
    : "4개 화면 앞의 하나의 모바일 입구입니다. 스캔한 뒤 휴대폰을 돌리면 V/A/L 값과 전시장 주가가 움직입니다.";

  return (
    <main className={`${ddongMeongSans.variable} ${styles.workspace}`}>
      <section className={styles.controls} aria-label="QR 포스터 설정">
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>A4 포스터 생성</h1>
          <p className={styles.introduction}>{introduction}</p>
        </div>

        <fieldset className={styles.projectChoices}>
          <legend>포스터 작품</legend>
          {posterProjects.map((project) => (
            <label key={project.id}>
              <input
                checked={project.id === parameters.project}
                name="poster-project"
                onChange={() =>
                  setParameters((current) =>
                    updateParameter(current, "project", project.id),
                  )
                }
                type="radio"
                value={project.id}
              />
              <span>{project.label}</span>
            </label>
          ))}
        </fieldset>

        {isDdongMeong ? (
          <>
            <label className={styles.buildingField}>
              <span>건물</span>
              <input
                maxLength={20}
                onChange={(event) =>
                  setParameters((current) =>
                    updateParameter(current, "building", event.target.value),
                  )
                }
                value={parameters.building}
              />
            </label>

            <fieldset className={styles.copyChoices}>
              <legend>포스터 멘트</legend>
              {posterCopies.map((copy) => (
                <label key={copy.id}>
                  <input
                    checked={copy.id === copyId}
                    name="poster-copy"
                    onChange={() => setCopyId(copy.id)}
                    type="radio"
                    value={copy.id}
                  />
                  <span>{copy.label}</span>
                </label>
              ))}
            </fieldset>
          </>
        ) : (
          <p className={styles.cValHelp}>
            C-VAL은 설치 전체가 하나의 참여 장면이므로, 건물별 위치값 없이 공개
            모바일 입구 하나만 사용합니다.
          </p>
        )}

        <label className={styles.urlField}>
          <span>QR 대상 주소</span>
          <textarea readOnly rows={3} value={entryUrl} />
        </label>
        <div className={styles.actions}>
          <button onClick={copyEntryUrl} type="button">
            주소 복사
          </button>
          <a href={entryUrl} rel="noreferrer" target="_blank">
            QR 대상 열기
          </a>
          {!isDdongMeong ? (
            <button onClick={downloadCValQrSvg} type="button">
              C-VAL QR SVG 다운로드
            </button>
          ) : null}
          <button onClick={() => window.print()} type="button">
            인쇄 / PDF 저장
          </button>
        </div>
        <p aria-live="polite" className={styles.copyStatus}>{copyStatus}</p>
      </section>

      <section className={styles.previewArea} aria-label="A4 인쇄 미리보기">
        {isDdongMeong ? (
          <article className={styles.poster}>
            <div className={styles.posterContent}>
              <h2>
                {selectedCopy.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
              <DdongMeongQrCode
                ariaLabel="똥멍 입장 QR 코드"
                className={styles.qrCode}
                value={entryUrl}
              />
              <p>4분 33초</p>
            </div>
            <div className={styles.posterBrand}>
              <img
                alt="ddong-meong"
                className={styles.posterBrandLogo}
                src="/wordmarks/ddong-meong.png"
              />
              <p>똥멍</p>
            </div>
          </article>
        ) : (
          <article className={`${styles.poster} ${styles.cValPoster}`}>
            <header className={styles.cValPosterHeader}>
              <p className={styles.cValBrand}>C-VAL</p>
              <p className={styles.cValExpansion}>
                Conducting Volatility, Activity, Liquidity
              </p>
            </header>
            <div className={`${styles.posterContent} ${styles.cValPosterContent}`}>
              <h2>
                {cValPosterCopy.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
              <p className={styles.cValSupportingLine}>
                {cValPosterCopy.supportingLine}
              </p>
              <DdongMeongQrCode
                ariaLabel="C-VAL 모바일 입장 QR 코드"
                className={styles.cValQrCode}
                value={entryUrl}
              />
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
