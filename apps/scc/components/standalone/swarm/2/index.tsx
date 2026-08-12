"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./swarm.module.css";
import {
  createFlock,
  stepFlock,
  type Boid,
  type Point,
  type RuleWeights,
} from "./model";
import {
  drawWorldMap,
  findCampaignAtPoint,
  getWorldConstraint,
  isPointInsideWorld,
} from "./map";

const FLOCK_SIZE = 500;
const DEFAULT_WEIGHTS: RuleWeights = {
  separation: 1.15,
  alignment: 0.82,
  cohesion: 0.72,
};

type RuleName = keyof RuleWeights;

const RULES: Array<{ name: RuleName; label: string; min: number; max: number }> = [
  { name: "separation", label: "separate", min: 0.2, max: 1.8 },
  { name: "alignment", label: "align", min: 0, max: 1.6 },
  { name: "cohesion", label: "gather", min: 0, max: 1.4 },
];

type AttentionPoint = Point & {
  countryId: string | null;
  countryName: string | null;
  campaignCode: string | null;
  campaignName: string | null;
};

type CampaignSummary = {
  id: string;
  code: string;
  name: string;
  swarmCount: number;
};

function summarizeCampaigns(points: AttentionPoint[]): CampaignSummary[] {
  if (points.length === 0) return [];

  const campaigns = new Map<string, CampaignSummary>();

  for (const point of points) {
    if (!point.countryId || !point.campaignCode || !point.campaignName) continue;
    if (!campaigns.has(point.countryId)) {
      campaigns.set(point.countryId, {
        id: point.countryId,
        code: point.campaignCode,
        name: point.campaignName,
        swarmCount: 0,
      });
    }
  }

  for (let boidId = 0; boidId < FLOCK_SIZE; boidId += 1) {
    const target = points[boidId % points.length];
    if (!target.countryId) continue;
    const campaign = campaigns.get(target.countryId);
    if (campaign) campaign.swarmCount += 1;
  }

  return Array.from(campaigns.values());
}

function drawFlock(context: CanvasRenderingContext2D, flock: Boid[]) {
  const halfLength = 3.5;
  const wing = 2.3;

  context.beginPath();

  for (const boid of flock) {
    const inverseSpeed = 1 / Math.hypot(boid.vx, boid.vy);
    const directionX = boid.vx * inverseSpeed;
    const directionY = boid.vy * inverseSpeed;
    const noseX = boid.x + directionX * halfLength;
    const noseY = boid.y + directionY * halfLength;
    const tailX = boid.x - directionX * halfLength;
    const tailY = boid.y - directionY * halfLength;
    const perpendicularX = -directionY * wing;
    const perpendicularY = directionX * wing;

    context.moveTo(noseX, noseY);
    context.lineTo(tailX + perpendicularX, tailY + perpendicularY);
    context.moveTo(noseX, noseY);
    context.lineTo(tailX - perpendicularX, tailY - perpendicularY);
  }

  context.stroke();
}

export default function SwarmTwo() {
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const flockRef = useRef<Boid[]>([]);
  const attentionTargetsRef = useRef<AttentionPoint[]>([]);
  const audioLayersRef = useRef(new Set<HTMLAudioElement>());
  const weightsRef = useRef<RuleWeights>(DEFAULT_WEIGHTS);
  const pausedRef = useRef(false);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [paused, setPaused] = useState(false);
  const [activeCampaigns, setActiveCampaigns] = useState<CampaignSummary[]>([]);

  const commitAttentionPoints = (points: AttentionPoint[]) => {
    attentionTargetsRef.current = points;
    setActiveCampaigns(summarizeCampaigns(points));
  };

  const playCampaignAudio = (campaignId: string) => {
    const audio = new Audio(
      `/audio/swarm-campaigns/${campaignId.toLowerCase()}.m4a`,
    );
    audio.preload = "auto";
    audioLayersRef.current.add(audio);
    audio.addEventListener("ended", () => {
      audioLayersRef.current.delete(audio);
    });
    void audio.play().catch(() => {
      audioLayersRef.current.delete(audio);
    });
  };

  const resetFlock = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    flockRef.current = createFlock(FLOCK_SIZE, canvas.clientWidth, canvas.clientHeight);
  }, []);

  useEffect(() => {
    weightsRef.current = weights;
  }, [weights]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const audioLayers = audioLayersRef.current;
    return () => {
      for (const audio of audioLayers) audio.pause();
      audioLayers.clear();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const backgroundCanvas = backgroundCanvasRef.current;
    const backgroundContext = backgroundCanvas?.getContext("2d") ?? null;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let previousBounds: { width: number; height: number } | null = null;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      if (previousBounds) {
        const oldBounds = previousBounds;
        attentionTargetsRef.current = attentionTargetsRef.current.map((target) => ({
          ...target,
          x: target.x * (bounds.width / oldBounds.width),
          y: target.y * (bounds.height / oldBounds.height),
        }));
      }

      previousBounds = { width: bounds.width, height: bounds.height };
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      flockRef.current = createFlock(FLOCK_SIZE, bounds.width, bounds.height);
      context.clearRect(0, 0, bounds.width, bounds.height);

      if (backgroundCanvas && backgroundContext) {
        backgroundCanvas.width = Math.round(bounds.width * pixelRatio);
        backgroundCanvas.height = Math.round(bounds.height * pixelRatio);
        backgroundContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        backgroundContext.clearRect(0, 0, bounds.width, bounds.height);
        drawWorldMap(backgroundContext, bounds.width, bounds.height);
      }
    };

    const render = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const delta = Math.min((time - previousTime) / 1000, 0.032);
      previousTime = time;

      context.save();
      context.globalCompositeOperation = "destination-out";
      context.fillStyle = "rgba(0, 0, 0, 0.2)";
      context.fillRect(0, 0, width, height);
      context.restore();

      if (!pausedRef.current && !reduceMotion.matches) {
        flockRef.current = stepFlock(
          flockRef.current,
          width,
          height,
          delta,
          weightsRef.current,
          attentionTargetsRef.current,
          getWorldConstraint(width, height),
        );
      }

      context.strokeStyle = "rgba(24, 25, 22, 0.78)";
      context.lineWidth = 1;
      context.lineCap = "round";
      drawFlock(context, flockRef.current);

      for (const attentionTarget of attentionTargetsRef.current) {
        if (attentionTarget.campaignCode) {
          context.fillStyle = "rgba(24, 25, 22, 0.82)";
          context.font = "600 11px Arial, Helvetica, sans-serif";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(
            attentionTarget.campaignCode,
            attentionTarget.x,
            attentionTarget.y,
          );
        }
      }

      frameRef.current = requestAnimationFrame(render);
    };

    sizeCanvas();
    const resizeObserver = new ResizeObserver(sizeCanvas);
    resizeObserver.observe(canvas);
    frameRef.current = requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const updateRule = (name: RuleName, value: number) => {
    setWeights((current) => ({ ...current, [name]: value }));
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={backgroundCanvasRef}
        className={styles.backgroundCanvas}
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A flock moving according to separation, alignment, and cohesion. Click to add attention points."
        tabIndex={0}
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - bounds.left;
          const y = event.clientY - bounds.top;
          if (!isPointInsideWorld(x, y, bounds.width, bounds.height)) {
            return;
          }
          const country = findCampaignAtPoint(
            x,
            y,
            bounds.width,
            bounds.height,
          );
          if (country) playCampaignAudio(country.id);
          commitAttentionPoints([
            ...attentionTargetsRef.current,
            {
              x,
              y,
              countryId: country?.id ?? null,
              countryName: country?.name ?? null,
              campaignCode: country?.campaignCode ?? null,
              campaignName: country?.campaignName ?? null,
            },
          ]);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const width = event.currentTarget.clientWidth;
          const height = event.currentTarget.clientHeight;
          const x = width / 2;
          const y = height / 2;
          const country = findCampaignAtPoint(x, y, width, height);
          if (country) playCampaignAudio(country.id);
          commitAttentionPoints([
            ...attentionTargetsRef.current,
            {
              x,
              y,
              countryId: country?.id ?? null,
              countryName: country?.name ?? null,
              campaignCode: country?.campaignCode ?? null,
              campaignName: country?.campaignName ?? null,
            },
          ]);
        }}
      />

      {activeCampaigns.length > 0 ? (
        <section className={styles.campaigns} aria-live="polite">
          <ul>
            {activeCampaigns.map((campaign) => (
              <li key={campaign.id}>
                <span className={styles.campaignCode}>{campaign.code}</span>
                <span className={styles.campaignName}>{campaign.name}</span>
                <span className={styles.campaignCount}>
                  {campaign.swarmCount} immigrants
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className={styles.controls}>
        <summary>rules</summary>
        <section className={styles.controlBody} aria-label="Swarm rules">
          <div className={styles.rules}>
            {RULES.map((rule) => (
              <label className={styles.rule} key={rule.name}>
                <span>{rule.label}</span>
                <input
                  type="range"
                  min={rule.min}
                  max={rule.max}
                  step="0.01"
                  value={weights[rule.name]}
                  onChange={(event) =>
                    updateRule(rule.name, Number(event.target.value))
                  }
                />
              </label>
            ))}
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={() => setPaused((current) => !current)}>
              {paused ? "continue" : "pause"}
            </button>
            <button type="button" onClick={resetFlock}>
              begin again
            </button>
            <button
              type="button"
              onClick={() => {
                for (const audio of audioLayersRef.current) audio.pause();
                audioLayersRef.current.clear();
                commitAttentionPoints([]);
              }}
            >
              clear points
            </button>
          </div>
        </section>
      </details>
    </main>
  );
}
