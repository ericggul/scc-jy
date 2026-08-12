const REQUEST_TIMEOUT_MS = 10_000;
const SLACK_CHANNEL_INTERVAL_MS = 1_000;
const RECOVERABLE_FAILURE_BASE_DELAY_MS = 1_000;
const RECOVERABLE_FAILURE_MAX_DELAY_MS = 30_000;
const TERMINAL_STATUS_CODES = new Set([400, 403, 404, 410]);
const SLACK_TEXT_LIMIT = 4_000;

function isEnabled(value) {
  return ["1", "true", "on", "slack"].includes(
    String(value ?? "").trim().toLowerCase(),
  );
}

function isSlackWebhookUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "hooks.slack.com" ||
        url.hostname === "hooks.slack-gov.com") &&
      /^\/services\/[^/]+\/[^/]+\/[^/]+/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function unicodeSlice(value, limit) {
  return Array.from(value).slice(0, limit).join("");
}

function normalizePublication(value) {
  if (typeof value === "string" && value.length > 0) {
    return { text: unicodeSlice(value, SLACK_TEXT_LIMIT) };
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
    text: unicodeSlice(value.text, SLACK_TEXT_LIMIT),
    blocks: Array.isArray(value.blocks) ? value.blocks.slice(0, 50) : undefined,
  };
}

async function responseText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function retryAfterMilliseconds(response) {
  const retryAfterSeconds = Number(response.headers?.get?.("retry-after"));
  return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
    ? Math.ceil(retryAfterSeconds * 1_000)
    : SLACK_CHANNEL_INTERVAL_MS;
}

/**
 * C-VAL-wide Slack Incoming Webhook transport. It owns no C-VAL wording or
 * market state. One Slack webhook has one app identity and one destination
 * channel, so callers provide text and optional Block Kit blocks, not personas.
 */
export function createSlackPublisher({
  env = process.env,
  fetchImpl = globalThis.fetch,
  sleep = wait,
  now = () => Date.now(),
  logger = console,
} = {}) {
  const webhookUrl = env.C_VAL_SLACK_WEBHOOK_URL?.trim();
  const configured = isEnabled(env.C_VAL_SLACK) && isSlackWebhookUrl(webhookUrl);
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
        "[c-val:external:slack] webhook disabled after terminal response",
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
      const body = { text: publication.text };
      if (publication.blocks) body.blocks = publication.blocks;
      response = await fetchImpl(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      recordFailure("network");
      logger.warn?.("[c-val:external:slack] delivery failed", error);
      return false;
    }

    if (response.ok) {
      consecutiveFailures = 0;
      metrics.sent += 1;
      // Slack documents one sustained message per second for one channel.
      nextAllowedAt = Math.max(
        nextAllowedAt,
        now() + SLACK_CHANNEL_INTERVAL_MS,
      );
      return true;
    }

    const detail = await responseText(response);
    if (response.status === 429) {
      metrics.rateLimited += 1;
      nextAllowedAt = Math.max(nextAllowedAt, now() + retryAfterMilliseconds(response));
    }
    recordFailure(response.status);
    logger.warn?.(
      "[c-val:external:slack] Slack rejected publication",
      response.status,
      detail,
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
        logger.warn?.("[c-val:external:slack] publication queue failed", error);
      })
      .finally(() => {
        draining = false;
        if (queuedPublication) startDrain();
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
      minimumIntervalMs: SLACK_CHANNEL_INTERVAL_MS,
      queue: {
        draining,
        hasPendingPublication: queuedPublication !== null,
        nextAllowedAt,
      },
      metrics: { ...metrics },
    }),
  };
}
