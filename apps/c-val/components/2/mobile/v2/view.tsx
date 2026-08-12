import Link from "next/link";
import type { CSSProperties } from "react";
import {
  type CValHumanControlInput,
  type CValInputMappingId,
  type CValParameterId,
} from "@/components/2/model";
import type {
  CValMobileAxisSignal,
  MotionPermission,
} from "@/components/2/mobile";
import { axisStrength, deriveCValMobileV2Readout } from "./presenter";
import styles from "./mobile-v2.module.css";

type RecordingStatus = "idle" | "recording" | "saving" | "saved" | "error";
type PriceState = "WAITING" | "RISING" | "FALLING" | "STILL";

const parameters: Array<{
  id: CValParameterId;
  symbol: string;
  label: string;
}> = [
  { id: "volatility", symbol: "V", label: "VOLATILITY" },
  { id: "activity", symbol: "A", label: "ACTIVITY" },
  { id: "liquidity", symbol: "L", label: "LIQUIDITY" },
];

export default function CValMobileV2View({
  price,
  priceMove,
  priceState,
  inputMappings,
  inputMapping,
  permission,
  control,
  axisSignal,
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
  axisSignal: CValMobileAxisSignal;
  recordingStatus: RecordingStatus;
  recordingMessage: string;
  onEnableMotion: () => void | Promise<void>;
  onSelectInputMapping: (mapping: CValInputMappingId) => void;
}) {
  const readout = deriveCValMobileV2Readout(inputMapping, axisSignal, control);
  const alphaStrength = axisStrength(axisSignal.alpha);
  const betaStrength = axisStrength(axisSignal.beta);
  const gammaStrength = axisStrength(axisSignal.gamma);
  const globeStyle = {
    "--alpha-opacity": 0.28 + alphaStrength * 0.72,
    "--beta-opacity": 0.28 + betaStrength * 0.72,
    "--gamma-opacity": 0.28 + gammaStrength * 0.72,
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
          <Link className={styles.versionLink} href="/2/mobile">V1</Link>
          <strong className={styles.currentVersion}>V2</strong>
          <Link className={styles.versionLink} href="/2/mobile/v3">V3</Link>
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

      <section className={styles.instrument} aria-label="Live phone rotation to V A L calculation">
        <div className={styles.globeArea} style={globeStyle}>
          <svg
            className={styles.globe}
            viewBox="0 0 320 320"
            role="img"
            aria-label="Three-axis angular velocity globe"
          >
            <circle className={styles.globeBoundary} cx="160" cy="160" r="116" />
            <ellipse className={styles.globeGrid} cx="160" cy="160" rx="116" ry="42" />
            <ellipse className={styles.globeGrid} cx="160" cy="160" rx="42" ry="116" />
            <circle className={`${styles.axisRing} ${styles.alphaRing}`} cx="160" cy="160" r="92" />
            <ellipse className={`${styles.axisRing} ${styles.betaRing}`} cx="160" cy="160" rx="48" ry="104" />
            <ellipse className={`${styles.axisRing} ${styles.gammaRing}`} cx="160" cy="160" rx="104" ry="48" />
            <line className={styles.axisStem} x1="160" y1="44" x2="160" y2="276" />
            <line className={styles.axisStem} x1="44" y1="160" x2="276" y2="160" />
            <circle className={styles.globeCore} cx="160" cy="160" r="7" />
          </svg>

          <div className={`${styles.axisReadout} ${styles.alphaReadout}`}>
            <b>α</b>
            <strong>{formatAxis(axisSignal.alpha, readout.inputUnit)}</strong>
          </div>
          <div className={`${styles.axisReadout} ${styles.betaReadout}`}>
            <b>β</b>
            <strong>{formatAxis(axisSignal.beta, readout.inputUnit)}</strong>
          </div>
          <div className={`${styles.axisReadout} ${styles.gammaReadout}`}>
            <b>γ</b>
            <strong>{formatAxis(axisSignal.gamma, readout.inputUnit)}</strong>
          </div>

          {permission !== "listening" ? (
            <button
              type="button"
              className={styles.enableButton}
              onClick={onEnableMotion}
            >
              {permission === "denied"
                ? "MOTION DENIED"
                : permission === "unavailable"
                  ? "MOTION UNAVAILABLE"
                  : "ENABLE MOTION"}
            </button>
          ) : (
            <div className={styles.combinedReadout}>
              {readout.summaryLines.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.equations} aria-label="Live V A L equations">
          {readout.formulaLines.map((line, index) => {
            const firstEquals = line.indexOf("=");
            const lastEquals = line.lastIndexOf("=");
            return (
              <output key={parameters[index].id}>
                <div className={styles.parameterName}>
                  <b>{parameters[index].symbol}</b>
                  <span>{parameters[index].label}</span>
                </div>
                <strong>{(control[parameters[index].id] * 100).toFixed(0)}</strong>
                <span className={styles.formula}>
                  {line.slice(firstEquals + 1, lastEquals).trim()}
                </span>
              </output>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatAxis(value: number, unit: "°" | "°/s") {
  return `${signed(value)}${unit}`;
}
