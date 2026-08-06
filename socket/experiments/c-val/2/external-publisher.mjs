const DEFAULT_COOLDOWN_MS = 15_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRY_AFTER_RATE_LIMIT = 1;

const regimeDefinitions = {
  crash: {
    label: "급락",
    echoes: [
      "체결은 이어지는데 호가가 비는 속도가 더 빠르다.",
      "숫자가 떨어지는 게 아니라, 주변의 말이 먼저 무너진다.",
      "한 번의 손목 움직임이 여기서는 이미 여러 사람의 체감이 된다.",
    ],
  },
  down: {
    label: "하락",
    echoes: [
      "체결가가 내려갈수록 다음 문장은 조금 더 짧아진다.",
      "매도 우위라는 말이 방 안의 공기를 바꾸기 시작했다.",
      "가격보다 먼저 흔들리는 것은 기다림의 길이이다.",
    ],
  },
  flat: {
    label: "보합",
    echoes: [
      "아직은 조용하다. 조용함도 다음 움직임을 기다리는 형식이다.",
      "체결은 계속되지만, 이 방의 문장은 방향을 정하지 못한다.",
      "균형처럼 보이는 순간에도 누군가는 다음 파동을 계산한다.",
    ],
  },
  up: {
    label: "상승",
    echoes: [
      "체결가가 오르자, 같은 숫자를 읽는 목소리가 갑자기 많아진다.",
      "상승은 가격의 방향이면서 동시에 말의 속도이다.",
      "호가 사이의 틈이 좁아질수록 확신처럼 들리는 문장이 늘어난다.",
    ],
  },
  surge: {
    label: "급등",
    echoes: [
      "체결창이 먼저 달리고, 해석은 그 뒤를 헐떡이며 따라간다.",
      "급등은 한 숫자보다 많은 반응을 동시에 생산한다.",
      "화면 밖의 감정도 이 속도를 견딜 수 있을까.",
    ],
  },
};

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function stableHash(value) {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

function cValRegime(change) {
  if (change <= -3) return "crash";
  if (change < -0.25) return "down";
  if (change >= 3) return "surge";
  if (change > 0.25) return "up";
  return "flat";
}

function cValShockBand(oneSecondMove) {
  const magnitude = Math.abs(oneSecondMove);
  if (magnitude >= 2) return "violent";
  if (magnitude >= 0.5) return "sharp";
  return "quiet";
}

function shockBandLevel(band) {
  if (band === "violent") return 2;
  if (band === "sharp") return 1;
  return 0;
}

function asPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isDiscordWebhookUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "discord.com" || url.hostname === "discordapp.com") &&
      /^\/api\/webhooks\/[^/]+\/[^/]+/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function sourceUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function retryAfterMilliseconds(response, body) {
  const header = response.headers?.get?.("retry-after");
  const headerSeconds = Number(header);
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) {
    return Math.ceil(headerSeconds * 1_000);
  }
  const bodySeconds = Number(body?.retry_after);
  return Number.isFinite(bodySeconds) && bodySeconds > 0
    ? Math.ceil(bodySeconds * 1_000)
    : 1_000;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function responseBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formattedChange(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/**
 * Turns one execution-derived C-VAL snapshot into a clearly marked public
 * artwork message. The Korean utterances are generated social residue, not
 * real community comments, investment research, or attributed speech.
 */
export function presentCValExternalPublication(
  snapshot,
  trigger,
  { publicSourceUrl = process.env.C_VAL_2_EXTERNAL_SOURCE_URL } = {},
) {
  const change = finite(snapshot.market?.changeFromOpenPercent);
  const oneSecondMove = finite(snapshot.market?.oneSecondMovePercent);
  const regime = cValRegime(change);
  const definition = regimeDefinitions[regime];
  const seed = stableHash(
    `${snapshot.runId}:${snapshot.revision}:${trigger}:${regime}:${oneSecondMove.toFixed(2)}`,
  );
  const echoes = Array.from({ length: 3 }, (_, index) => {
    const phrase = definition.echoes[(seed + index) % definition.echoes.length];
    return `${String(index + 1).padStart(2, "0")} / ${phrase}`;
  });
  const source = sourceUrl(publicSourceUrl);
  const lines = [
    "**C-VAL / 외부 관측 기록**",
    "자동 생성된 시뮬레이션 사회 반응입니다. 실제 증권·투자 판단이나 실제 이용자 발화가 아닙니다.",
    "",
    `상태: ${definition.label} · 체결가: ${finite(snapshot.market?.index, 100).toFixed(2)} · 개장 대비: ${formattedChange(change)} · 최근 1초: ${formattedChange(oneSecondMove)}`,
    "",
    ...echoes,
    "",
    `원인: ${trigger} · C-VAL run ${snapshot.runId} / revision ${snapshot.revision}`,
  ];
  if (source) lines.push(source);
  return {
    key: `${snapshot.runId}:${trigger}:${regime}:${cValShockBand(oneSecondMove)}`,
    content: lines.join("\n"),
    regime,
  };
}

/**
 * A narrow outbound boundary for an artist-owned Discord channel. It is off
 * by default, accepts no browser input, and never alters C-VAL market state.
 */
export function createCValDiscordPublisher({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  sleep = wait,
  logger = console,
} = {}) {
  const configuredWebhook = env.C_VAL_2_DISCORD_WEBHOOK_URL?.trim();
  const enabled =
    env.C_VAL_2_EXTERNAL_PUBLISHER === "discord" &&
    isDiscordWebhookUrl(configuredWebhook);
  const cooldownMs = clamp(
    asPositiveInteger(
      env.C_VAL_2_EXTERNAL_PUBLISHER_COOLDOWN_MS,
      DEFAULT_COOLDOWN_MS,
    ),
    DEFAULT_COOLDOWN_MS,
    300_000,
  );
  let lastRegime = null;
  let lastShockBand = "quiet";
  let lastPublishedAt = Number.NEGATIVE_INFINITY;
  let pending = Promise.resolve();
  const queuedKeys = new Set();
  const publicSourceUrl = sourceUrl(env.C_VAL_2_EXTERNAL_SOURCE_URL);

  async function deliver(publication) {
    for (let attempt = 0; attempt <= MAX_RETRY_AFTER_RATE_LIMIT; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(configuredWebhook, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            content: publication.content,
            username: "C-VAL 관측봇",
            allowed_mentions: { parse: [] },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        logger.warn?.("[c-val:v2:external] Discord delivery failed", error);
        return false;
      }

      if (response.ok) return true;
      const body = await responseBody(response);
      if (response.status === 429 && attempt < MAX_RETRY_AFTER_RATE_LIMIT) {
        await sleep(retryAfterMilliseconds(response, body));
        continue;
      }
      logger.warn?.(
        "[c-val:v2:external] Discord rejected publication",
        response.status,
      );
      return false;
    }
    return false;
  }

  function observe(snapshot) {
    if (!snapshot || snapshot.phase !== "active") return null;
    const change = finite(snapshot.market?.changeFromOpenPercent);
    const oneSecondMove = finite(snapshot.market?.oneSecondMovePercent);
    const regime = cValRegime(change);
    const shockBand = cValShockBand(oneSecondMove);
    const regimeChanged = lastRegime !== null && regime !== lastRegime;
    const shockEscalated = shockBandLevel(shockBand) > shockBandLevel(lastShockBand);
    lastRegime = regime;
    lastShockBand = shockBand;
    if (!enabled || (!regimeChanged && !shockEscalated)) return null;
    if (now() - lastPublishedAt < cooldownMs) return null;

    const trigger = regimeChanged
      ? `누적 체결 변화 ${regimeDefinitions[regime].label} 전환`
      : `1초 체결 변동 ${shockBand === "violent" ? "격화" : "증폭"}`;
    const publication = presentCValExternalPublication(snapshot, trigger, {
      publicSourceUrl,
    });
    if (queuedKeys.has(publication.key)) return null;

    queuedKeys.add(publication.key);
    lastPublishedAt = now();
    pending = pending
      .then(() => deliver(publication))
      .catch((error) => {
        logger.warn?.("[c-val:v2:external] publication queue failed", error);
      })
      .finally(() => queuedKeys.delete(publication.key));
    return publication;
  }

  return {
    observe,
    flush: () => pending,
    status: () => ({ enabled, cooldownMs }),
  };
}
