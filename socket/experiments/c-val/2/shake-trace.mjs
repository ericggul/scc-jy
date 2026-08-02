const TRACE_SCHEMA_VERSION = 1;
const DEFAULT_DURATION_MS = 10_500;
const NOMINAL_SAMPLE_RATE_HZ = 60;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function wrap360(value) {
  return ((value % 360) + 360) % 360;
}

function smoothstep(value) {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
}

function createRandom(seed) {
  let state = seed >>> 0;
  let spareNormal = null;
  const uniform = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
  const normal = () => {
    if (spareNormal !== null) {
      const value = spareNormal;
      spareNormal = null;
      return value;
    }
    const radius = Math.sqrt(
      -2 * Math.log(Math.max(uniform(), Number.EPSILON)),
    );
    const angle = 2 * Math.PI * uniform();
    spareNormal = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };
  return { normal, uniform };
}

function burstEnvelope(timeMs, startMs, endMs) {
  if (timeMs <= startMs || timeMs >= endMs) return 0;
  const progress = (timeMs - startMs) / (endMs - startMs);
  return Math.sin(Math.PI * smoothstep(progress));
}

function tracePhase(timeMs) {
  if (timeMs < 800) return "rest";
  if (timeMs < 1_600) return "pickup";
  if (timeMs < 3_250) return "shake-1";
  if (timeMs < 3_550) return "pause-1";
  if (timeMs < 5_700) return "shake-2";
  if (timeMs < 6_000) return "pause-2";
  if (timeMs < 8_300) return "shake-3";
  if (timeMs < 9_350) return "recovery";
  return "rest";
}

function pickupEnvelope(timeMs) {
  if (timeMs <= 800) return 0;
  if (timeMs < 1_600) return smoothstep((timeMs - 800) / 800);
  if (timeMs < 8_300) return 1;
  if (timeMs < 9_350) {
    return 1 - smoothstep((timeMs - 8_300) / 1_050);
  }
  return 0;
}

function shakeAxes(timeMs) {
  const seconds = timeMs / 1_000;
  const burst1 = burstEnvelope(timeMs, 1_600, 3_250);
  const burst2 = burstEnvelope(timeMs, 3_550, 5_700);
  const burst3 = burstEnvelope(timeMs, 6_000, 8_300);
  const alpha =
    burst1 *
      (54 * Math.sin(2 * Math.PI * 3.7 * seconds) +
        16 * Math.sin(2 * Math.PI * 7.1 * seconds + 0.8)) +
    burst2 *
      (74 * Math.sin(2 * Math.PI * 4.5 * seconds + 0.3) +
        13 * Math.sin(2 * Math.PI * 8.4 * seconds)) +
    burst3 *
      (65 * Math.sin(2 * Math.PI * 5.2 * seconds + 1.1) +
        20 * Math.sin(2 * Math.PI * 3.1 * seconds));
  const beta =
    burst1 *
      (62 * Math.sin(2 * Math.PI * 3.7 * seconds + 0.72) +
        12 * Math.sin(2 * Math.PI * 6.8 * seconds)) +
    burst2 *
      (82 * Math.sin(2 * Math.PI * 4.5 * seconds + 0.95) +
        18 * Math.sin(2 * Math.PI * 2.4 * seconds)) +
    burst3 *
      (70 * Math.sin(2 * Math.PI * 5.2 * seconds + 1.7) +
        15 * Math.sin(2 * Math.PI * 7.6 * seconds));
  const gamma =
    burst1 *
      (31 * Math.sin(2 * Math.PI * 3.7 * seconds + 1.28) +
        8 * Math.sin(2 * Math.PI * 8.1 * seconds)) +
    burst2 *
      (43 * Math.sin(2 * Math.PI * 4.5 * seconds + 1.58) +
        7 * Math.sin(2 * Math.PI * 3.2 * seconds)) +
    burst3 *
      (39 * Math.sin(2 * Math.PI * 5.2 * seconds + 2.02) +
        9 * Math.sin(2 * Math.PI * 6.3 * seconds));
  return { alpha, beta, gamma };
}

/**
 * Produces a deterministic, biomechanically plausible synthetic browser
 * DeviceOrientation trace. It is not presented as measured human IMU data.
 */
export function generateCValShakeTrace({
  seed = 0xc0ffee,
  durationMs = DEFAULT_DURATION_MS,
} = {}) {
  const random = createRandom(seed);
  const baseline = {
    alpha: 344 + random.uniform() * 12,
    beta: -8 + random.uniform() * 12,
    gamma: -6 + random.uniform() * 12,
  };
  const events = [];
  let timeMs = 0;
  let driftAlpha = 0;
  let driftBeta = 0;
  let driftGamma = 0;
  let sequence = 0;

  while (timeMs <= durationMs) {
    const phase = tracePhase(timeMs);
    const pickup = pickupEnvelope(timeMs);
    const shake = shakeAxes(timeMs);
    driftAlpha += random.normal() * 0.018;
    driftBeta += random.normal() * 0.012;
    driftGamma += random.normal() * 0.009;
    const tremor = Math.sin(2 * Math.PI * 9.2 * (timeMs / 1_000));
    const sensorNoiseScale = phase.startsWith("shake") ? 0.75 : 0.18;

    events.push({
      id: `orientation-${++sequence}`,
      tMs: Number(timeMs.toFixed(3)),
      phase,
      absolute: false,
      alpha: Number(
        wrap360(
          baseline.alpha +
            pickup * 24 +
            shake.alpha +
            driftAlpha +
            tremor * 0.35 +
            random.normal() * sensorNoiseScale,
        ).toFixed(6),
      ),
      beta: Number(
        clamp(
          baseline.beta +
            pickup * 18 +
            shake.beta +
            driftBeta +
            tremor * 0.22 +
            random.normal() * sensorNoiseScale,
          -179,
          179,
        ).toFixed(6),
      ),
      gamma: Number(
        clamp(
          baseline.gamma +
            pickup * 7 +
            shake.gamma +
            driftGamma +
            tremor * 0.16 +
            random.normal() * sensorNoiseScale,
          -89,
          89,
        ).toFixed(6),
      ),
    });

    let intervalMs =
      1_000 / NOMINAL_SAMPLE_RATE_HZ + random.normal() * 1.45;
    if (random.uniform() < 0.025) {
      intervalMs += 24 + random.uniform() * 72;
    }
    timeMs += clamp(intervalMs, 8, 110);
  }

  return {
    schemaVersion: TRACE_SCHEMA_VERSION,
    kind: "browser-device-orientation",
    profile: "one-hand-bursts-v1",
    provenance: {
      type: "synthetic",
      generator: "c-val-shake-trace-v1",
      seed,
    },
    nominalSampleRateHz: NOMINAL_SAMPLE_RATE_HZ,
    durationMs,
    events,
  };
}

export function validateCValOrientationTrace(trace) {
  const errors = [];
  if (trace?.schemaVersion !== TRACE_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${TRACE_SCHEMA_VERSION}`);
  }
  if (trace?.kind !== "browser-device-orientation") {
    errors.push('kind must be "browser-device-orientation"');
  }
  if (!Array.isArray(trace?.events) || trace.events.length < 2) {
    errors.push("events must contain at least two samples");
  } else {
    let previousTime = -Infinity;
    const ids = new Set();
    for (const [index, event] of trace.events.entries()) {
      if (typeof event.id !== "string" || ids.has(event.id)) {
        errors.push(`events[${index}].id must be a unique string`);
      }
      ids.add(event.id);
      if (!Number.isFinite(event.tMs) || event.tMs <= previousTime) {
        errors.push(`events[${index}].tMs must increase monotonically`);
      }
      previousTime = event.tMs;
      for (const axis of ["alpha", "beta", "gamma"]) {
        if (!Number.isFinite(event[axis])) {
          errors.push(`events[${index}].${axis} must be finite`);
        }
      }
      if (event.alpha < 0 || event.alpha >= 360) {
        errors.push(`events[${index}].alpha must be in [0, 360)`);
      }
      if (event.beta < -180 || event.beta > 180) {
        errors.push(`events[${index}].beta must be in [-180, 180]`);
      }
      if (event.gamma < -90 || event.gamma > 90) {
        errors.push(`events[${index}].gamma must be in [-90, 90]`);
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(`Invalid C-VAL orientation trace:\n- ${errors.join("\n- ")}`);
  }
  return trace;
}

export const cValShakeTraceSchema = {
  version: TRACE_SCHEMA_VERSION,
  defaultDurationMs: DEFAULT_DURATION_MS,
  nominalSampleRateHz: NOMINAL_SAMPLE_RATE_HZ,
};

