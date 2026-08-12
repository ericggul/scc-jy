import { createTelegramPublisher } from "../external/telegram.mjs";
import { cValExecutionIntensity } from "./market-intensity.mjs";

const MINIMUM_TELEGRAM_INTERVAL_MS = 1_000;
const MAXIMUM_TELEGRAM_INTERVAL_MS = 2_000;

const commentary = {
  rise: [
    "<b>체결 알림</b> · {from} → <b>{price}</b>",
    "🟢 <b>{price}</b> 통과",
    "⚡️ {price} 쪽 체결 이어짐",
    "<b>가격 갱신</b> · <b>{price}</b>",
  ],
  fall: [
    "<b>체결 알림</b> · {from} → <b>{price}</b>",
    "🔴 <b>{price}</b>까지 밀림",
    "⚡️ {price} 쪽 체결 이어짐",
    "<b>가격 갱신</b> · <b>{price}</b>",
  ],
  reversal: [
    "↔️ <b>방향 전환</b> · {from} → <b>{price}</b>",
    "<b>체결 반전</b> · {from}에서 <b>{price}</b>",
    "<b>흐름 전환</b> · 현재 <b>{price}</b>",
    "↔️ <b>{price}</b>에서 방향 바뀜",
  ],
  flat: [
    "👁 <b>{price}</b> 부근 체결 지속",
    "<b>체결 메모</b> · <b>{price}</b>",
    "<b>호가 메모</b> · {low}–{high} 안에서 <b>{price}</b>",
    "<b>{seconds}초</b>째 {price} 부근",
  ],
};

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function stableHash(value) {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

function number(value) {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(finite(value));
}

function interpolate(template, parameters) {
  return template.replace(
    /\{(price|from|low|high|seconds)\}/g,
    (_match, key) => parameters[key],
  );
}

/** Telegram's one-chat limit, interpreted from actual V2 executions. */
export function cValTelegramIntervalMs(snapshot) {
  const intensity = cValExecutionIntensity(snapshot);
  if (intensity >= 0.5) return MINIMUM_TELEGRAM_INTERVAL_MS;
  if (intensity >= 0.15) return 1_500;
  return MAXIMUM_TELEGRAM_INTERVAL_MS;
}

function direction(current, prior, oneSecondMove) {
  const delta = current - prior;
  if (Math.abs(delta) > Number.EPSILON) return Math.sign(delta);
  return Math.sign(oneSecondMove);
}

function commentaryKey(currentDirection, priorDirection) {
  if (priorDirection && currentDirection && priorDirection !== currentDirection) {
    return "reversal";
  }
  if (currentDirection > 0) return "rise";
  if (currentDirection < 0) return "fall";
  return "flat";
}

/** Builds one channel-bulletin Telegram HTML payload from an execution snapshot. */
export function presentCValTelegramPublication(snapshot, sequence, priorPublication) {
  const market = snapshot.market ?? {};
  const price = finite(market.index, 100);
  const priorPrice = priorPublication?.price ?? price;
  const currentDirection = direction(price, priorPrice, market.oneSecondMovePercent);
  const key = commentaryKey(currentDirection, priorPublication?.direction ?? 0);
  const parameters = {
    price: number(price),
    from: number(priorPrice),
    low: number(market.oneSecondLow),
    high: number(market.oneSecondHigh),
    seconds: Math.max(
      0.1,
      (finite(snapshot.serverTime) - finite(priorPublication?.serverTime, snapshot.serverTime)) /
        1_000,
    ).toFixed(1),
  };
  const seed = stableHash(`${snapshot.runId}:${sequence}:${key}:${price}`);
  const text = interpolate(commentary[key][seed % commentary[key].length], parameters);
  return {
    key: `${snapshot.runId}:${sequence}`,
    text,
    parseMode: "HTML",
    disableNotification: true,
    state: {
      price,
      serverTime: finite(snapshot.serverTime),
      direction: currentDirection,
    },
  };
}

/** V2's Telegram channel projection; generic Bot API delivery stays C-VAL-wide. */
export function createCValTelegramPublisher({
  env = process.env,
  fetchImpl = globalThis.fetch,
  sleep,
  now,
  logger = console,
} = {}) {
  const telegram = createTelegramPublisher({ env, fetchImpl, sleep, now, logger });
  let observedRunId = null;
  let lastPublishedAt = 0;
  let priorPublication = null;

  function reset() {
    lastPublishedAt = 0;
    priorPublication = null;
  }

  function observe(snapshot) {
    if (!snapshot || snapshot.phase !== "active" || !telegram.status().enabled) {
      return null;
    }
    const activatedAt = finite(snapshot.activatedAt);
    const serverTime = finite(snapshot.serverTime);
    if (activatedAt <= 0 || serverTime <= activatedAt) return null;
    if (observedRunId !== snapshot.runId) {
      observedRunId = snapshot.runId;
      reset();
      lastPublishedAt = activatedAt;
    }
    const intervalMs = cValTelegramIntervalMs(snapshot);
    if (serverTime - lastPublishedAt < intervalMs) return null;

    const publication = presentCValTelegramPublication(
      snapshot,
      snapshot.revision,
      priorPublication,
    );
    if (!telegram.publish(publication)) return null;
    lastPublishedAt = serverTime;
    priorPublication = publication.state;
    return { ...publication, intervalMs };
  }

  return {
    observe,
    flush: () => telegram.flush(),
    status: () => ({
      ...telegram.status(),
      maximumIntervalMs: MAXIMUM_TELEGRAM_INTERVAL_MS,
    }),
  };
}
