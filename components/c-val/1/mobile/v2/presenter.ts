import {
  rotationRateToCValControl,
  type CValHumanControlInput,
  type CValInputMappingId,
} from "@/components/c-val/1/model";
import type { CValMobileAxisSignal } from "@/components/c-val/1/mobile";

export type CValMobileV2Derivation = {
  energy: number;
  signedRotation: number;
  inputUnit: "°" | "°/s";
  summaryLines: ReadonlyArray<readonly [string, string]>;
  formulaLines: readonly [string, string, string];
};

export function deriveCValMobileV2Readout(
  inputMapping: CValInputMappingId,
  axes: CValMobileAxisSignal,
  control: CValHumanControlInput,
): CValMobileV2Derivation {
  if (inputMapping === "current") {
    const gesture = rotationRateToCValControl(axes);
    return {
      energy: gesture.energyDegreesPerSecond,
      signedRotation: gesture.signedRotationDegreesPerSecond,
      inputUnit: "°/s",
      summaryLines: [
        ["E = |α| + |β| + |γ|", gesture.energyDegreesPerSecond.toFixed(1)],
        ["S = α + β + γ", signed(gesture.signedRotationDegreesPerSecond)],
      ],
      formulaLines: [
        `V = 50 + 48 × E/(12+E) = ${(control.volatility * 100).toFixed(0)}`,
        `A = 50 + 48 × S/(12+|S|) = ${(control.activity * 100).toFixed(0)}`,
        `L = 50 − 48 × E/(12+E) = ${(control.liquidity * 100).toFixed(0)}`,
      ],
    };
  }

  if (inputMapping === "07a5aaf") {
    const direction = Math.max(-1, Math.min(axes.beta / 35, 1));
    return {
      energy: Math.abs(axes.beta),
      signedRotation: axes.beta,
      inputUnit: "°",
      summaryLines: [
        ["d = clamp(β/35)", signed(direction)],
        ["i = |d|", Math.abs(direction).toFixed(2)],
      ],
      formulaLines: [
        `V = 50 + 50|d| = ${(control.volatility * 100).toFixed(0)}`,
        `A = 50 + 50d = ${(control.activity * 100).toFixed(0)}`,
        `L = 50 − 50|d| = ${(control.liquidity * 100).toFixed(0)}`,
      ],
    };
  }

  return {
    energy: Math.abs(axes.alpha) + Math.abs(axes.beta) + Math.abs(axes.gamma),
    signedRotation: axes.alpha + axes.beta + axes.gamma,
    inputUnit: "°",
    summaryLines: [
      ["α → V", signed(axes.alpha)],
      ["β → A", signed(axes.beta)],
      ["γ → L", signed(axes.gamma)],
    ],
    formulaLines: [
      `V = clamp(50 + 50α/90) = ${(control.volatility * 100).toFixed(0)}`,
      `A = clamp(50 + 50β/90) = ${(control.activity * 100).toFixed(0)}`,
      `L = clamp(50 + 50γ/45) = ${(control.liquidity * 100).toFixed(0)}`,
    ],
  };
}

export function axisStrength(value: number) {
  return Math.min(Math.abs(value) / 36, 1);
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}
