const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRY_AFTER_RATE_LIMIT = 1;
const RECOVERABLE_FAILURE_BASE_DELAY_MS = 1_000;
const RECOVERABLE_FAILURE_MAX_DELAY_MS = 30_000;
const TERMINAL_STATUS_CODES = new Set([401, 403, 404]);
const DISCORD_MESSAGE_CONTENT_LIMIT = 2_000;

function isEnabled(value) {
  return ["1", "true", "on", "discord"].includes(
    String(value ?? "").trim().toLowerCase(),
  );
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

function retryAfterMilliseconds(response, body) {
  const headerSeconds = Number(response.headers?.get?.("retry-after"));
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) {
    return Math.ceil(headerSeconds * 1_000);
  }
  const bodySeconds = Number(body?.retry_after);
  return Number.isFinite(bodySeconds) && bodySeconds > 0
    ? Math.ceil(bodySeconds * 1_000)
    : 1_000;
}

function rateLimitDelayMilliseconds(response) {
  const remaining = Number(response.headers?.get?.("x-ratelimit-remaining"));
  const resetAfterSeconds = Number(
    response.headers?.get?.("x-ratelimit-reset-after"),
  );
  return remaining === 0 && Number.isFinite(resetAfterSeconds) && resetAfterSeconds > 0
    ? Math.ceil(resetAfterSeconds * 1_000)
    : 0;
}

function rateLimitPacingDelayMilliseconds(response) {
  const remaining = Number(response.headers?.get?.("x-ratelimit-remaining"));
  const resetAfterSeconds = Number(
    response.headers?.get?.("x-ratelimit-reset-after"),
  );
  // Spread the remaining sends across the live window rather than exhausting
  // the bucket in one burst and then appearing to go silent.
  return Number.isFinite(remaining) &&
    remaining > 0 &&
    Number.isFinite(resetAfterSeconds) &&
    resetAfterSeconds > 0
    ? Math.ceil((resetAfterSeconds * 1_000) / (remaining + 1))
    : 0;
}

function normalizePublication(value) {
  if (typeof value === "string" && value.length > 0) {
    return { content: value };
  }
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.content !== "string" ||
    value.content.length === 0
  ) {
    return null;
  }
  return {
    // Array.from advances by Unicode code point, so it never leaves half of an
    // emoji surrogate pair at Discord's 2,000-character content boundary.
    content: Array.from(value.content)
      .slice(0, DISCORD_MESSAGE_CONTENT_LIMIT)
      .join(""),
    username:
      typeof value.username === "string" && value.username.length > 0
        ? value.username.slice(0, 80)
        : undefined,
  };
}

/**
 * C-VAL-wide Discord transport. It has no knowledge of a C-VAL version,
 * market model, screen, or text-generation rule. Future C-VAL effects can
 * reuse this credential boundary without inheriting V2 market semantics.
 */
export function createDiscordPublisher({
  env = process.env,
  fetchImpl = globalThis.fetch,
  sleep = wait,
  now = () => Date.now(),
  logger = console,
} = {}) {
  const webhookUrl = env.C_VAL_DISCORD_WEBHOOK_URL?.trim();
  const enabled = isEnabled(env.C_VAL_DISCORD) && isDiscordWebhookUrl(webhookUrl);
  let pending = Promise.resolve();
  let queuedPublication = null;
  let draining = false;
  let nextAllowedAt = 0;
  let terminalFailure = null;
  let consecutiveFailures = 0;
  let rateLimit = null;
  const metrics = {
    accepted: 0,
    sent: 0,
    coalesced: 0,
    rateLimited: 0,
    failed: 0,
  };

  async function waitForRateLimitWindow() {
    while (nextAllowedAt > now()) {
      await sleep(nextAllowedAt - now());
    }
  }

  function delayAfterFailure() {
    const delay = Math.min(
      RECOVERABLE_FAILURE_BASE_DELAY_MS * 2 ** Math.max(0, consecutiveFailures - 1),
      RECOVERABLE_FAILURE_MAX_DELAY_MS,
    );
    nextAllowedAt = Math.max(nextAllowedAt, now() + delay);
  }

  function recordFailure(status) {
    metrics.failed += 1;
    consecutiveFailures += 1;
    if (TERMINAL_STATUS_CODES.has(status)) {
      terminalFailure = status;
      logger.warn?.(
        "[c-val:external:discord] webhook disabled after terminal response",
        status,
      );
      return;
    }
    delayAfterFailure();
  }

  function observeRateLimitHeaders(response) {
    const numericHeader = (name) => {
      const value = response.headers?.get?.(name);
      return value === null || value === undefined || value === ""
        ? Number.NaN
        : Number(value);
    };
    const limit = numericHeader("x-ratelimit-limit");
    const remaining = numericHeader("x-ratelimit-remaining");
    const resetAfterSeconds = numericHeader("x-ratelimit-reset-after");
    const bucket = response.headers?.get?.("x-ratelimit-bucket") ?? null;
    if (
      !Number.isFinite(limit) &&
      !Number.isFinite(remaining) &&
      !Number.isFinite(resetAfterSeconds) &&
      !bucket
    ) {
      return;
    }
    rateLimit = {
      limit: Number.isFinite(limit) ? limit : null,
      remaining: Number.isFinite(remaining) ? remaining : null,
      resetAfterMs: Number.isFinite(resetAfterSeconds)
        ? Math.ceil(resetAfterSeconds * 1_000)
        : null,
      bucket,
    };
  }

  async function deliver(publication) {
    await waitForRateLimitWindow();
    for (let attempt = 0; attempt <= MAX_RETRY_AFTER_RATE_LIMIT; attempt += 1) {
      let response;
      try {
        const body = {
          content: publication.content,
          allowed_mentions: { parse: [] },
        };
        if (publication.username) body.username = publication.username;
        response = await fetchImpl(webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        recordFailure("network");
        logger.warn?.("[c-val:external:discord] delivery failed", error);
        return false;
      }

      const rateLimitDelay = rateLimitDelayMilliseconds(response);
      observeRateLimitHeaders(response);
      if (rateLimitDelay > 0) {
        nextAllowedAt = Math.max(nextAllowedAt, now() + rateLimitDelay);
      } else {
        const pacingDelay = rateLimitPacingDelayMilliseconds(response);
        if (pacingDelay > 0) {
          nextAllowedAt = Math.max(nextAllowedAt, now() + pacingDelay);
        }
      }
      if (response.ok) {
        consecutiveFailures = 0;
        metrics.sent += 1;
        return true;
      }
      const body = await responseBody(response);
      if (response.status === 429 && attempt < MAX_RETRY_AFTER_RATE_LIMIT) {
        metrics.rateLimited += 1;
        nextAllowedAt = Math.max(
          nextAllowedAt,
          now() + retryAfterMilliseconds(response, body),
        );
        await waitForRateLimitWindow();
        continue;
      }
      if (response.status === 429) metrics.rateLimited += 1;
      recordFailure(response.status);
      logger.warn?.(
        "[c-val:external:discord] Discord rejected publication",
        response.status,
      );
      return false;
    }
    return false;
  }

  async function drain() {
    while (queuedPublication) {
      const publication = queuedPublication;
      queuedPublication = null;
      await deliver(publication);
    }
  }

  function startDrain() {
    if (draining) return;
    draining = true;
    pending = drain()
      .catch((error) => {
        logger.warn?.("[c-val:external:discord] publication queue failed", error);
      })
      .finally(() => {
        draining = false;
        if (queuedPublication) startDrain();
      });
  }

  function publish(value) {
    const publication = normalizePublication(value);
    if (!enabled || terminalFailure || !publication) return false;

    // Discord may slow a webhook below the requested market cadence. Keep the
    // latest execution-state utterance instead of building an unbounded queue
    // of stale market messages.
    if (queuedPublication) metrics.coalesced += 1;
    metrics.accepted += 1;
    queuedPublication = publication;
    startDrain();
    return true;
  }

  async function flush() {
    while (draining || queuedPublication) {
      const activeDrain = pending;
      await activeDrain;
      if (activeDrain === pending && !draining && !queuedPublication) return;
    }
  }

  return {
    publish,
    flush,
    status: () => ({
      enabled: enabled && terminalFailure === null,
      configured: enabled,
      terminalFailure,
      queue: {
        draining,
        hasPendingPublication: queuedPublication !== null,
        nextAllowedAt,
      },
      metrics: { ...metrics },
      rateLimit,
    }),
  };
}
