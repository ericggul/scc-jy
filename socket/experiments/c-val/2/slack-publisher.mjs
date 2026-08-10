import { createSlackPublisher } from "../external/slack.mjs";
import {
  cValSlackReportIntervalMs,
  presentCValSlackReport,
} from "./slack/reports.mjs";

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export const cValSlackIntervalMs = cValSlackReportIntervalMs;
export const presentCValSlackPublication = presentCValSlackReport;

/** V2's Slack projection; the generic transport remains C-VAL-wide. */
export function createCValSlackPublisher({
  env = process.env,
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  const slack = createSlackPublisher({ env, fetchImpl, logger });
  let observedRunId = null;
  let lastPublishedAt = 0;
  let priorPublication = null;

  function reset() {
    lastPublishedAt = 0;
    priorPublication = null;
  }

  function observe(snapshot) {
    if (!snapshot || snapshot.phase !== "active" || !slack.status().enabled) {
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
    const intervalMs = cValSlackReportIntervalMs(snapshot);
    if (serverTime - lastPublishedAt < intervalMs) return null;

    const publication = presentCValSlackReport(
      snapshot,
      snapshot.revision,
      priorPublication,
    );
    if (!slack.publish({ text: publication.text, blocks: publication.blocks })) {
      return null;
    }
    lastPublishedAt = serverTime;
    priorPublication = publication.state;
    return { ...publication, intervalMs };
  }

  return {
    observe,
    flush: () => slack.flush(),
    status: () => ({
      ...slack.status(),
      maximumIntervalMs: cValSlackReportIntervalMs(),
    }),
  };
}
