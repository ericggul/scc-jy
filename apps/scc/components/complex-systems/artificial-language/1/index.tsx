"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./artificial-language.module.css";
import {
  concepts,
  createLanguageField,
  getConsensus,
  getSpeaker,
  getWordVariants,
  stepLanguageField,
  type ConceptId,
  type LanguageField,
  type LanguageInteraction,
  type Speaker,
} from "./model";

const STEP_MILLISECONDS = 780;

type InteractionPulse = {
  interaction: LanguageInteraction;
  startedAt: number;
};

function pointForSpeaker(speaker: Speaker, width: number, height: number) {
  return { x: speaker.x * width, y: speaker.y * height };
}

function drawLanguageField(
  context: CanvasRenderingContext2D,
  field: LanguageField,
  concept: ConceptId,
  pulse: InteractionPulse | null,
  now: number,
) {
  const { canvas } = context;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  context.clearRect(0, 0, width, height);

  const speakersById = new Map(field.speakers.map((speaker) => [speaker.id, speaker]));
  context.lineCap = "round";
  for (const tie of field.ties) {
    const source = speakersById.get(tie.source);
    const target = speakersById.get(tie.target);
    if (!source || !target) continue;
    const from = pointForSpeaker(source, width, height);
    const to = pointForSpeaker(target, width, height);
    context.strokeStyle = `rgba(36, 49, 58, ${0.09 + tie.affinity * 0.18})`;
    context.lineWidth = 0.55 + tie.affinity * 0.75;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  const active = pulse?.interaction;
  for (const speaker of field.speakers) {
    const point = pointForSpeaker(speaker, width, height);
    const word = [...speaker.lexicon[concept]].sort(
      (left, right) => right.strength - left.strength || right.uses - left.uses,
    )[0].form;
    const involved = active?.source === speaker.id || active?.target === speaker.id;
    context.fillStyle = involved ? "#a66039" : "#24313a";
    context.fillRect(point.x - 1.5, point.y - 1.5, 3, 3);
    context.fillStyle = involved ? "rgba(166, 96, 57, 0.94)" : "rgba(36, 49, 58, 0.76)";
    context.font = `${Math.max(11, Math.min(20, width / 66))}px Georgia, 'Times New Roman', serif`;
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.fillText(word, point.x, point.y - 7);
  }

  if (!pulse || now - pulse.startedAt > STEP_MILLISECONDS) return;
  const source = getSpeaker(field, pulse.interaction.source);
  const target = getSpeaker(field, pulse.interaction.target);
  if (!source || !target) return;
  const progress = Math.min(1, (now - pulse.startedAt) / (STEP_MILLISECONDS * 0.74));
  const from = pointForSpeaker(source, width, height);
  const to = pointForSpeaker(target, width, height);
  const x = from.x + (to.x - from.x) * progress;
  const y = from.y + (to.y - from.y) * progress;
  context.fillStyle = pulse.interaction.outcome === "mutation" ? "#a66039" : "#46696f";
  context.font = `${Math.max(14, Math.min(26, width / 48))}px Georgia, 'Times New Roman', serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(pulse.interaction.sent, x, y);
}

function interactionSentence(interaction: LanguageInteraction | null) {
  if (!interaction) return "the first word is waiting to cross a relation";
  if (interaction.outcome === "echo") {
    return `“${interaction.sent}” held for ${interaction.concept}`;
  }
  if (interaction.outcome === "mutation") {
    return `“${interaction.sent}” shifted into “${interaction.received}”`;
  }
  return `“${interaction.sent}” was taken up for ${interaction.concept}`;
}

export default function ArtificialLanguageOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const [field, setField] = useState<LanguageField>(createLanguageField);
  const fieldRef = useRef<LanguageField>(field);
  const pulseRef = useRef<InteractionPulse | null>(null);
  const pausedRef = useRef(false);
  const selectedConceptRef = useRef<ConceptId>("water");
  const [paused, setPaused] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<ConceptId>("water");

  const runInteraction = useCallback((concept?: ConceptId) => {
    const next = stepLanguageField(fieldRef.current, concept);
    fieldRef.current = next;
    pulseRef.current = next.lastInteraction
      ? { interaction: next.lastInteraction, startedAt: performance.now() }
      : null;
    setField(next);
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    selectedConceptRef.current = selectedConcept;
  }, [selectedConcept]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousStep = performance.now();

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const render = (now: number) => {
      if (
        !pausedRef.current &&
        !reducedMotion.matches &&
        now - previousStep >= STEP_MILLISECONDS
      ) {
        runInteraction();
        previousStep = now;
      }
      drawLanguageField(
        context,
        fieldRef.current,
        selectedConceptRef.current,
        pulseRef.current,
        now,
      );
      frameRef.current = requestAnimationFrame(render);
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    frameRef.current = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [runInteraction]);

  const variants = getWordVariants(field, selectedConcept).slice(0, 4);
  const consensus = Math.round(getConsensus(field, selectedConcept) * 100);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A social field where invented words move between speakers and evolve through agreement, copying, and mutation."
      />

      <header className={styles.header}>
        <div>
          <h1>language field</h1>
          <p>local imitation · mutation · relation repair</p>
        </div>
        <output>{field.interactionCount} utterances</output>
      </header>

      <aside className={styles.lexicon} aria-label={`Words for ${selectedConcept}`}>
        <p>{selectedConcept}</p>
        <ol>
          {variants.map((variant) => (
            <li key={variant.form}>
              <span>{variant.form}</span>
              <output>{variant.speakers} voices</output>
            </li>
          ))}
        </ol>
        <small>{consensus}% currently agree</small>
      </aside>

      <section className={styles.conversation} aria-live="polite">
        <p>{interactionSentence(field.lastInteraction)}</p>
      </section>

      <section className={styles.controls} aria-label="Language field controls">
        <div className={styles.meanings}>
          {concepts.map((concept) => (
            <button
              key={concept.id}
              className={selectedConcept === concept.id ? styles.selected : undefined}
              type="button"
              onClick={() => {
                setSelectedConcept(concept.id);
                runInteraction(concept.id);
              }}
            >
              speak {concept.label}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "continue" : "pause"}
          </button>
          <button
            type="button"
            onClick={() => {
              const next = createLanguageField(fieldRef.current.randomSeed + 7919);
              fieldRef.current = next;
              pulseRef.current = null;
              setField(next);
            }}
          >
            new field
          </button>
        </div>
      </section>
    </main>
  );
}
