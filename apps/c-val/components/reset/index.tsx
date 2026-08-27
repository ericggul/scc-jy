"use client";

import { useState } from "react";
import { useCValSocket } from "@/components/transport";
import styles from "./reset.module.css";

export default function CValReset() {
  const [restartMessage, setRestartMessage] = useState("Ready.");
  const [restarting, setRestarting] = useState(false);
  const { connected, connectionError, presence, state, restartServer } =
    useCValSocket({ role: "reset" });

  const relayStatus = connectionError
    ? connectionError
    : connected
      ? "Connected"
      : "Connecting";

  async function handleRestart() {
    setRestarting(true);
    setRestartMessage("Requesting restart…");
    const result = await restartServer();
    if (!result.ok) {
      setRestarting(false);
      setRestartMessage(result.error ?? "Restart request failed.");
      return;
    }
    setRestartMessage("Restart requested. Connected C-VAL views are reloading.");
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="reset-title">
        <h1 id="reset-title">C-VAL relay</h1>
        <dl className={styles.status}>
          <div>
            <dt>Connection</dt>
            <dd>{relayStatus}</dd>
          </div>
          <div>
            <dt>Market</dt>
            <dd>{state?.phase ?? "Awaiting relay status"}</dd>
          </div>
          <div>
            <dt>Views</dt>
            <dd>{presence?.screens ?? 0} screens · {presence?.controllers ?? 0} controller · {presence?.mobiles ?? 0} mobile</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={handleRestart}
          disabled={!connected || restarting}
        >
          {restarting ? "Restarting…" : "Restart relay"}
        </button>
        <p className={styles.message} aria-live="polite">{restartMessage}</p>
      </section>
    </main>
  );
}
