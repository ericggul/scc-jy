import Link from "next/link";
import type { CSSProperties } from "react";
import {
  cValParameterLabels,
  type CValHumanControlInput,
  type CValInputMappingId,
} from "@/components/c-val/1/model";
import type {
  CValMobileAxisSignal,
  MotionPermission,
} from "@/components/c-val/1/mobile";
import styles from "./mobile-v3.module.css";

type RecordingStatus = "idle" | "recording" | "saving" | "saved" | "error";
type PriceState = "WAITING" | "RISING" | "FALLING" | "STILL";

export default function CValMobileV3View({
  price,
  priceMove,
  priceState,
  inputMappings,
  inputMapping,
  permission,
  control,
  phoneOrientation,
  recordingStatus,
  recordingMessage,
  onEnableMotion,
  onSelectInputMapping,
}: {
  price: number;
  priceMove: number;
  priceState: PriceState;
  inputMappings: Array<{ id: CValInputMappingId; label: string }>;
  inputMapping: CValInputMappingId;
  permission: MotionPermission;
  control: CValHumanControlInput;
  phoneOrientation: CValMobileAxisSignal;
  recordingStatus: RecordingStatus;
  recordingMessage: string;
  onEnableMotion: () => void | Promise<void>;
  onSelectInputMapping: (mapping: CValInputMappingId) => void;
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
        <nav className={styles.versionNav} aria-label="Mobile interface version">
          <Link className={styles.versionLink} href="/c-val/1/mobile">V1</Link>
          <Link className={styles.versionLink} href="/c-val/1/mobile/v2">V2</Link>
          <strong className={styles.currentVersion}>V3</strong>
        </nav>
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

      <nav className={styles.mappingNav} aria-label="Input mapping comparison">
        {inputMappings.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={inputMapping === id ? styles.mappingActive : undefined}
            onClick={() => onSelectInputMapping(id)}
          >
            {label}
          </button>
        ))}
      </nav>

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
