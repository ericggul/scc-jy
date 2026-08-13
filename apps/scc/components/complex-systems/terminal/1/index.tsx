"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./terminal.module.css";
import {
  activeCommandText,
  advanceTerminalColony,
  createTerminalColony,
  releaseFragment,
  type TerminalAgent,
} from "./model";

function AgentTerminal({ agent, time }: { agent: TerminalAgent; time: number }) {
  const activeText = activeCommandText(agent, time);
  const isOpening = time - agent.openedAt < 0.86;

  return (
    <li className={styles.terminalItem} data-opening={isOpening ? "true" : undefined}>
      <article className={styles.terminal} aria-label={`${agent.id} terminal`}>
        <header className={styles.terminalHeader}>
          <span>{agent.id}</span>
          {agent.parentId ? <span>from {agent.parentId}</span> : <span>local</span>}
        </header>
        <div className={styles.terminalBody}>
          {agent.lines.map((line) => (
            <p key={line.id} data-kind={line.kind}>
              {line.kind === "command" ? "$ " : "> "}{line.text}
            </p>
          ))}
          {activeText ? (
            <p className={styles.activeCommand}>
              $ {activeText}<span aria-hidden="true">▌</span>
            </p>
          ) : (
            <p className={styles.idlePrompt} aria-hidden="true">$</p>
          )}
        </div>
      </article>
    </li>
  );
}

export default function TerminalOne() {
  const [colony, setColony] = useState(createTerminalColony);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previous = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const deltaSeconds = (now - previous) / 1000;
      previous = now;
      if (pausedRef.current || reduceMotion.matches) return;
      setColony((current) => advanceTerminalColony(current, deltaSeconds));
    }, 80);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>terminal colony</h1>
        <p>each shell decides what to write next</p>
      </header>

      <section className={styles.field} aria-label="Autonomous terminal agents">
        <ol className={styles.terminalGrid}>
          {colony.agents.map((agent) => (
            <AgentTerminal key={agent.id} agent={agent} time={colony.time} />
          ))}
        </ol>
      </section>

      <div className={styles.controls}>
        <output>
          {colony.agents.length} shells · {colony.signals.length} travelling traces
        </output>
        <div>
          <button
            type="button"
            onClick={() => setColony((current) => releaseFragment(current))}
          >
            release fragment
          </button>
          <button
            type="button"
            aria-pressed={paused}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? "continue" : "pause"}
          </button>
        </div>
      </div>
    </main>
  );
}
