import { createDiscordPublisher } from "../external/discord.mjs";
import {
  cValMarketAccents,
  cValMarketCommentPools,
  cValMarketHandles,
} from "./market-commentary.mjs";

const MINIMUM_EXTERNAL_INTERVAL_MS = 200;
const MAXIMUM_EXTERNAL_INTERVAL_MS = 5_000;
const RECENT_TEMPLATE_MEMORY = 24;
const RECENT_HANDLE_MEMORY = 12;

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

function signedPercent(value) {
  const normalized = finite(value);
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(2)}%`;
}

function percent(value) {
  return `${Math.abs(finite(value)).toFixed(2)}%`;
}

function replaceParameters(template, parameters) {
  return template.replace(
    /\{(price|from|dayMove|pulse|low|high|openMove|seconds|range)\}/g,
    (_match, key) => parameters[key],
  );
}

/**
 * Measures only already-realized execution movement in the compressed
 * one-market-day window. Phone input and visual state never enter here.
 */
export function cValExternalIntensity(snapshot) {
  const market = snapshot.market ?? {};
  const price = Math.max(finite(market.index, 100), Number.EPSILON);
  const dayMove = Math.abs(finite(market.oneSecondMovePercent));
  const dayRange =
    (Math.abs(finite(market.oneSecondHigh) - finite(market.oneSecondLow)) / price) *
    100;
  const realizedVolatility = Math.abs(finite(market.realizedVolatilityBps)) / 100;
  return Math.max(dayMove, dayRange, realizedVolatility);
}

/** Requested cadence. Discord's live response headers can impose a slower one. */
export function cValExternalIntervalMs(snapshot) {
  const intensity = cValExternalIntensity(snapshot);
  if (intensity >= 1.25) return MINIMUM_EXTERNAL_INTERVAL_MS;
  if (intensity >= 0.5) return 400;
  if (intensity >= 0.15) return 1_000;
  if (intensity >= 0.05) return 2_000;
  return MAXIMUM_EXTERNAL_INTERVAL_MS;
}

function movementDirection(currentPrice, priorPrice, dayMove) {
  const priceMove = currentPrice - priorPrice;
  if (Math.abs(priceMove) > Number.EPSILON) return Math.sign(priceMove);
  return Math.sign(dayMove);
}

function poolKey({ intensity, direction, priorDirection }) {
  if (priorDirection && direction && priorDirection !== direction) return "reversal";
  if (direction > 0) return intensity >= 1.25 ? "surgeUp" : "up";
  if (direction < 0) return intensity >= 1.25 ? "surgeDown" : "down";
  return "flat";
}

function selectFromPool(pool, seed, intensity, recentlyUsed) {
  const eligible = pool.filter(
    (entry) =>
      intensity >= entry.minIntensity &&
      intensity <= entry.maxIntensity &&
      !recentlyUsed.includes(entry.text),
  );
  const fallback = pool.filter(
    (entry) => intensity >= entry.minIntensity && intensity <= entry.maxIntensity,
  );
  const choices = eligible.length > 0 ? eligible : fallback.length > 0 ? fallback : pool;
  return choices[seed % choices.length];
}

function selectHandle(seed, recentlyUsed) {
  const eligible = cValMarketHandles.filter((handle) => !recentlyUsed.includes(handle));
  const choices = eligible.length > 0 ? eligible : cValMarketHandles;
  return choices[seed % choices.length];
}

function selectAccent(key, seed, intensity) {
  // The fast stream has a denser reaction layer; quiet turns leave more air.
  const silenceWeight = intensity >= 1.25 ? 1 : intensity >= 0.25 ? 2 : 4;
  const choices = [
    ...Array.from({ length: silenceWeight }, () => ""),
    ...cValMarketAccents[key],
  ];
  return choices[seed % choices.length];
}

function publicationParameters(snapshot, priorPublication) {
  const market = snapshot.market ?? {};
  const price = finite(market.index, 100);
  const previousPrice = priorPublication?.price ?? price;
  const range =
    (Math.abs(finite(market.oneSecondHigh, price) - finite(market.oneSecondLow, price)) /
      Math.max(price, Number.EPSILON)) *
    100;
  const elapsedSeconds = Math.max(
    0.1,
    (finite(snapshot.serverTime) - finite(priorPublication?.serverTime, snapshot.serverTime)) /
      1_000,
  );
  return {
    price,
    dayMove: finite(market.oneSecondMovePercent),
    direction: movementDirection(price, previousPrice, market.oneSecondMovePercent),
    parameters: {
      price: number(price),
      from: number(previousPrice),
      dayMove: signedPercent(market.oneSecondMovePercent),
      pulse: signedPercent(((price - previousPrice) / Math.max(previousPrice, Number.EPSILON)) * 100),
      low: number(market.oneSecondLow),
      high: number(market.oneSecondHigh),
      openMove: signedPercent(market.changeFromOpenPercent),
      seconds: elapsedSeconds.toFixed(1),
      range: percent(range),
    },
  };
}

/**
 * Produces a single community utterance from actual execution values. The
 * memory argument is private to the V2 interpreter; it never crosses sockets.
 */
export function presentCValExternalPublication(snapshot, sequence, memory = {}) {
  const intensity = cValExternalIntensity(snapshot);
  const context = publicationParameters(snapshot, memory.lastPublication);
  const key = poolKey({
    intensity,
    direction: context.direction,
    priorDirection: memory.lastDirection,
  });
  const seed = stableHash(
    `${snapshot.runId}:${sequence}:${key}:${context.price}:${context.dayMove}`,
  );
  const template = selectFromPool(
    cValMarketCommentPools[key],
    seed,
    intensity,
    memory.recentTemplates ?? [],
  );
  const username = selectHandle(seed >>> 11, memory.recentHandles ?? []);
  const accent = selectAccent(key, seed >>> 19, intensity);
  return {
    key: `${snapshot.runId}:${sequence}`,
    username,
    content: `${replaceParameters(template.text, context.parameters)}${
      accent ? ` ${accent}` : ""
    }`,
    template: template.text,
    marketDirection: context.direction,
    intensity,
    publicationState: {
      price: context.price,
      serverTime: finite(snapshot.serverTime),
    },
  };
}

/**
 * The V2 adapter owns wording memory and the requested C-VAL cadence. The
 * shared Discord transport owns only delivery, throttling, and recovery.
 */
export function createCValDiscordPublisher({
  env = process.env,
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  const discord = createDiscordPublisher({ env, fetchImpl, logger });
  let observedRunId = null;
  let lastPublishedAt = 0;
  const memory = {
    lastPublication: null,
    lastDirection: 0,
    recentTemplates: [],
    recentHandles: [],
  };

  function resetMemory() {
    lastPublishedAt = 0;
    memory.lastPublication = null;
    memory.lastDirection = 0;
    memory.recentTemplates = [];
    memory.recentHandles = [];
  }

  function observe(snapshot) {
    if (!snapshot || snapshot.phase !== "active" || !discord.status().enabled) {
      return null;
    }
    const activatedAt = finite(snapshot.activatedAt, 0);
    const serverTime = finite(snapshot.serverTime, 0);
    if (activatedAt <= 0 || serverTime <= activatedAt) return null;
    if (snapshot.runId !== observedRunId) {
      observedRunId = snapshot.runId;
      resetMemory();
      lastPublishedAt = activatedAt;
    }

    const intervalMs = cValExternalIntervalMs(snapshot);
    if (serverTime - lastPublishedAt < intervalMs) return null;

    const publication = presentCValExternalPublication(snapshot, snapshot.revision, memory);
    const accepted = discord.publish({
      content: publication.content,
      username: publication.username,
    });
    if (!accepted) return null;

    lastPublishedAt = serverTime;
    memory.lastPublication = publication.publicationState;
    memory.lastDirection = publication.marketDirection;
    memory.recentTemplates = [
      publication.template,
      ...memory.recentTemplates,
    ].slice(0, RECENT_TEMPLATE_MEMORY);
    memory.recentHandles = [publication.username, ...memory.recentHandles].slice(
      0,
      RECENT_HANDLE_MEMORY,
    );
    return { ...publication, intervalMs };
  }

  return {
    observe,
    flush: () => discord.flush(),
    status: () => ({
      ...discord.status(),
      minimumIntervalMs: MINIMUM_EXTERNAL_INTERVAL_MS,
      maximumIntervalMs: MAXIMUM_EXTERNAL_INTERVAL_MS,
    }),
  };
}
