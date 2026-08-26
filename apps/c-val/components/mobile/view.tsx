import type { CSSProperties } from "react";
import {
  cValParameterLabels,
  type CValHumanControlInput,
} from "@/components/model";
import type {
  CValMobileAxisSignal,
  MotionPermission,
} from "@/components/mobile";
import styles from "./mobile.module.css";

type RecordingStatus = "idle" | "recording" | "saving" | "saved" | "error";
type PriceState = "WAITING" | "RISING" | "FALLING" | "STILL";

export default function CValMobileView({
  price,
  priceMove,
  priceState,
  priceHistory,
  permission,
  control,
  phoneOrientation,
  recordingStatus,
  recordingMessage,
  onEnableMotion,
}: {
  price: number;
  priceMove: number;
  priceState: PriceState;
  priceHistory: readonly number[];
  permission: MotionPermission;
  control: CValHumanControlInput;
  phoneOrientation: CValMobileAxisSignal;
  recordingStatus: RecordingStatus;
  recordingMessage: string;
  onEnableMotion: () => void | Promise<void>;
}) {
  const globeStyle = {
    "--globe-alpha": `${-phoneOrientation.alpha}deg`,
    "--globe-beta": `${-phoneOrientation.beta}deg`,
    "--globe-gamma": `${-phoneOrientation.gamma}deg`,
  } as CSSProperties;
  const marketTone =
    priceState === "RISING"
      ? styles.rising
      : priceState === "FALLING"
        ? styles.falling
        : "";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <output
          className={styles.market}
          aria-label={`${priceState}, market ${price.toFixed(2)}, ${priceMove.toFixed(1)} percent`}
        >
          <strong className={marketTone}>{price.toFixed(2)}</strong>
          <span className={marketTone}>
            {priceMove >= 0 ? "+" : ""}{priceMove.toFixed(1)}%
          </span>
        </output>
      </header>

      <MarketTrace
        history={priceHistory}
        price={price}
        priceState={priceState}
      />

      {recordingStatus !== "idle" && recordingMessage ? (
        <output className={styles.recording} data-status={recordingStatus}>
          {recordingMessage}
        </output>
      ) : null}

      <section className={styles.globeArea} aria-label="Live alpha beta gamma orientation">
        <div
          className={styles.globeShell}
          style={globeStyle}
          role="img"
          aria-label="World-stabilized alpha beta gamma orientation globe"
        >
          <span className={styles.alphaScale} />
          <span className={styles.alphaDatum} />
          <span className={styles.alphaPointer} />

          <div className={styles.sphereViewport}>
            <div className={styles.sphereFrame}>
              <span className={`${styles.latitude} ${styles.latitudeNorthFar}`} />
              <span className={`${styles.latitude} ${styles.latitudeNorthNear}`} />
              <span className={`${styles.latitude} ${styles.equator}`} />
              <span className={`${styles.latitude} ${styles.latitudeSouthNear}`} />
              <span className={`${styles.latitude} ${styles.latitudeSouthFar}`} />

              <span className={`${styles.meridian} ${styles.primeMeridian}`} />
              <span className={`${styles.meridian} ${styles.meridianFortyFive}`} />
              <span className={`${styles.meridian} ${styles.meridianNinety}`} />
              <span className={`${styles.meridian} ${styles.meridianOneThirtyFive}`} />
            </div>
          </div>

          <span className={styles.fixedReticle}>
            <i />
          </span>
        </div>

        <div className={`${styles.axisReadout} ${styles.alphaReadout}`}>
          <span className={styles.axisName}>
            <b>α</b>
            <span>TURN</span>
          </span>
          <strong>{formatAngle(phoneOrientation.alpha)}</strong>
        </div>
        <div className={`${styles.axisReadout} ${styles.betaReadout}`}>
          <span className={styles.axisName}>
            <b>β</b>
            <span>TILT</span>
          </span>
          <strong>{formatAngle(phoneOrientation.beta)}</strong>
        </div>
        <div className={`${styles.axisReadout} ${styles.gammaReadout}`}>
          <span className={styles.axisName}>
            <b>γ</b>
            <span>ROLL</span>
          </span>
          <strong>{formatAngle(phoneOrientation.gamma)}</strong>
        </div>

        {permission !== "listening" ? (
          <div className={styles.motionGate}>
            <button type="button" className={styles.enableButton} onClick={onEnableMotion}>
              {permission === "denied"
                ? "MOTION DENIED"
                : permission === "unavailable"
                  ? "MOTION UNAVAILABLE"
                  : "ENABLE MOTION"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-3 border-t border-white/[0.12] font-mono tabular-nums">
        {(
          [
            ["volatility", "INTENSITY", "#ffd60a"],
            ["activity", "DIRECTION", "#32d74b"],
            ["liquidity", "DEPTH", "#64d2ff"],
          ] as const
        ).map(([parameterId, axis, color], index) => (
          <div
            key={parameterId}
            className={`${index < 2 ? "border-r border-white/[0.12]" : ""} px-3 py-4`}
            style={{ color }}
          >
            <div className="truncate text-[10px]">
              {cValParameterLabels[parameterId]} {axis}
            </div>
            <div className="mt-1 text-[clamp(20px,7vw,38px)] leading-none">
              {(control[parameterId] * 100).toFixed(0)}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatAngle(value: number) {
  return `${signed(value)}°`;
}

function MarketTrace({
  history,
  price,
  priceState,
}: {
  history: readonly number[];
  price: number;
  priceState: PriceState;
}) {
  const series = [...history, price].filter(Number.isFinite).slice(-121);
  const values = series.length > 0 ? series : [100];
  const minimum = Math.min(100, ...values);
  const maximum = Math.max(100, ...values);
  const range = maximum - minimum || 1;
  const point = (value: number, index: number) => {
    const x = (index / Math.max(values.length - 1, 1)) * 360;
    const y = 4 + (1 - (value - minimum) / range) * 44;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };
  const baselineY = 4 + (1 - (100 - minimum) / range) * 44;
  const trendClass =
    priceState === "RISING"
      ? styles.rising
      : priceState === "FALLING"
        ? styles.falling
        : undefined;

  return (
    <section className={styles.marketTrace} aria-label="Live market performance">
      <svg
        viewBox="0 0 360 52"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Live stock performance. Current price ${price.toFixed(2)}.`}
      >
        <line className={styles.marketBaseline} x1="0" x2="360" y1={baselineY} y2={baselineY} />
        <polyline
          className={`${styles.marketLine} ${trendClass ?? ""}`}
          points={values.map(point).join(" ")}
        />
      </svg>
    </section>
  );
}
