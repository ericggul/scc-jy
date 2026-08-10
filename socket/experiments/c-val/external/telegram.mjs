const REQUEST_TIMEOUT_MS = 10_000;
const TELEGRAM_CHAT_INTERVAL_MS = 1_000;
const RECOVERABLE_FAILURE_BASE_DELAY_MS = 1_000;
const RECOVERABLE_FAILURE_MAX_DELAY_MS = 30_000;
const TERMINAL_STATUS_CODES = new Set([400, 401, 403, 404]);
const TELEGRAM_TEXT_LIMIT = 4_096;
const PARSE_MODES = new Set(["HTML", "MarkdownV2"]);

function isEnabled(value) {
  return ["1", "true", "on", "telegram"].includes(
    String(value ?? "").trim().toLowerCase(),
  );
}

function isBotToken(value) {
  return /^\d+:[A-Za-z0-9_-]+$/.test(String(value ?? "").trim());
}

function isChatId(value) {
  const normalized = String(value ?? "").trim();
  return /^@[A-Za-z0-9_]{5,32}$/.test(normalized) || /^-?\d+$/.test(normalized);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function unicodeSlice(value, limit) {
  return Array.from(value).slice(0, limit).join("");
}

function normalizePublication(value) {
  if (typeof value === "string" && value.length > 0) {
    return { text: unicodeSlice(value, TELEGRAM_TEXT_LIMIT) };
  }
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.text !== "string" ||
    value.text.length === 0
  ) {
    return null;
  }
  return {
    text: unicodeSlice(value.text, TELEGRAM_TEXT_LIMIT),
    parseMode: PARSE_MODES.has(value.parseMode) ? value.parseMode : undefined,
    disableNotification: value.disableNotification === true,
  };
}

async function responseBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function retryAfterMilliseconds(body) {
  const seconds = Number(body?.parameters?.retry_after);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.ceil(seconds * 1_000)
    : TELEGRAM_CHAT_INTERVAL_MS;
}

/**
 * C-VAL-wide Telegram Bot API transport. It owns credential validation,
 * one-chat delivery pacing, coalescing, and recovery, but no market wording.
 */
export function createTelegramPublisher({
  env = process.env,
  fetchImpl = globalThis.fetch,
  sleep = wait,
  now = () => Date.now(),
  logger = console,
} = {}) {
  const botToken = env.C_VAL_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.C_VAL_TELEGRAM_CHANNEL_ID?.trim();
  const configured =
    isEnabled(env.C_VAL_TELEGRAM) && isBotToken(botToken) && isChatId(chatId);
  const endpoint = configured
    ? `https://api.telegram.org/bot${botToken}/sendMessage`
    : null;
  let pending = Promise.resolve();
  let queuedPublication = null;
  let draining = false;
  let nextAllowedAt = 0;
  let terminalFailure = null;
  let consecutiveFailures = 0;
  const metrics = {
    accepted: 0,
    sent: 0,
    coalesced: 0,
    discarded: 0,
    rateLimited: 0,
    failed: 0,
  };

  async function waitForWindow() {
    while (nextAllowedAt > now()) {
      await sleep(nextAllowedAt - now());
    }
  }

  function backOffAfterFailure() {
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
      if (queuedPublication) {
        queuedPublication = null;
        metrics.discarded += 1;
      }
      logger.warn?.(
        "[c-val:external:telegram] bot transport disabled after terminal response",
        status,
      );
      return;
    }
    backOffAfterFailure();
  }

  async function deliver(publication) {
    if (!configured || terminalFailure) return false;
    await waitForWindow();
    if (terminalFailure) return false;
    let response;
    try {
      const body = {
        chat_id: chatId,
        text: publication.text,
        disable_web_page_preview: true,
      };
      if (publication.parseMode) body.parse_mode = publication.parseMode;
      if (publication.disableNotification) body.disable_notification = true;
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      recordFailure("network");
      logger.warn?.("[c-val:external:telegram] delivery failed", error);
      return false;
    }

    const body = await responseBody(response);
    const succeeded = response.ok && (body === null || body.ok !== false);
    if (succeeded) {
      consecutiveFailures = 0;
      metrics.sent += 1;
      // Telegram documents one sustained message per second in one chat.
      nextAllowedAt = Math.max(nextAllowedAt, now() + TELEGRAM_CHAT_INTERVAL_MS);
      return true;
    }

    const status = Number(body?.error_code) || response.status || "telegram";
    if (status === 429) {
      metrics.rateLimited += 1;
      nextAllowedAt = Math.max(nextAllowedAt, now() + retryAfterMilliseconds(body));
    }
    recordFailure(status);
    logger.warn?.(
      "[c-val:external:telegram] Telegram rejected publication",
      status,
    );
    return false;
  }

  async function drain() {
    while (queuedPublication && !terminalFailure) {
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
        logger.warn?.("[c-val:external:telegram] publication queue failed", error);
      })
      .finally(() => {
        draining = false;
        if (queuedPublication && !terminalFailure) startDrain();
      });
  }

  function publish(value) {
    const publication = normalizePublication(value);
    if (!configured || terminalFailure || !publication) return false;
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
      enabled: configured && terminalFailure === null,
      configured,
      terminalFailure,
      minimumIntervalMs: TELEGRAM_CHAT_INTERVAL_MS,
      queue: {
        draining,
        hasPendingPublication: queuedPublication !== null,
        nextAllowedAt,
      },
      metrics: { ...metrics },
    }),
  };
}
