"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  countryCoordinates,
  drawWorldMap,
  findCampaignAtPoint,
  getMapFrame,
  getWorldConstraint,
  isPointInsideWorld,
  projectCoordinate,
} from "../2/map";
import styles from "./swarm.module.css";
import {
  createFlock,
  selectMissileDestinations,
  stepFlock,
  type Boid,
  type MissileDestination,
  type Point,
  type RuleWeights,
} from "./model";

const FLOCK_SIZE = 500;
const MISSILES_PER_LAUNCH = 20;
const MISSILE_STAGGER_MS = 48;
const MISSILE_AFTERGLOW_MS = 680;
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

type Launch = {
  id: number;
  origin: Point;
  destinations: MissileDestination[];
  startedAt: number;
};

function quadraticPoint(
  source: Point,
  control: Point,
  destination: Point,
  progress: number,
): Point {
  const inverseProgress = 1 - progress;
  return {
    x:
      inverseProgress * inverseProgress * source.x +
      2 * inverseProgress * progress * control.x +
      progress * progress * destination.x,
    y:
      inverseProgress * inverseProgress * source.y +
      2 * inverseProgress * progress * control.y +
      progress * progress * destination.y,
  };
}

function trajectoryControl(source: Point, destination: Point, index: number): Point {
  const dx = destination.x - source.x;
  const dy = destination.y - source.y;
  const distance = Math.hypot(dx, dy) || 1;
  const direction = index % 2 === 0 ? 1 : -1;
  const bow = Math.min(124, distance * (0.1 + (index % 5) * 0.018)) * direction;

  return {
    x: (source.x + destination.x) / 2 - (dy / distance) * bow,
    y: (source.y + destination.y) / 2 + (dx / distance) * bow,
  };
}

function missileDuration(source: Point, destination: Point) {
  return Math.min(2_850, Math.max(900, Math.hypot(destination.x - source.x, destination.y - source.y) * 3.6));
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

function drawLaunchOrigin(context: CanvasRenderingContext2D, origin: Point) {
  context.save();
  context.strokeStyle = "rgba(153, 67, 49, 0.7)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(origin.x, origin.y, 5.5, 0, Math.PI * 2);
  context.moveTo(origin.x - 8, origin.y);
  context.lineTo(origin.x + 8, origin.y);
  context.moveTo(origin.x, origin.y - 8);
  context.lineTo(origin.x, origin.y + 8);
  context.stroke();
  context.restore();
}

function drawImpact(
  context: CanvasRenderingContext2D,
  target: Point,
  progress: number,
) {
  context.save();
  const fade = 1 - progress;
  const radius = 3 + progress * 11;
  context.strokeStyle = `rgba(153, 67, 49, ${0.9 * fade})`;
  context.fillStyle = `rgba(153, 67, 49, ${0.92 * fade})`;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(target.x, target.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(target.x, target.y, Math.max(0.8, 2.6 - progress * 1.8), 0, Math.PI * 2);
  context.fill();

  const burst = radius * 0.72;
  context.beginPath();
  context.moveTo(target.x - burst, target.y - burst);
  context.lineTo(target.x + burst, target.y + burst);
  context.moveTo(target.x + burst, target.y - burst);
  context.lineTo(target.x - burst, target.y + burst);
  context.stroke();
  context.restore();
}

function drawDestroyedTarget(context: CanvasRenderingContext2D, target: Point) {
  context.save();
  context.strokeStyle = "rgba(153, 67, 49, 0.72)";
  context.fillStyle = "rgba(153, 67, 49, 0.72)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(target.x, target.y, 4.5, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(target.x, target.y, 1.35, 0, Math.PI * 2);
  context.fill();

  for (let index = 0; index < 4; index += 1) {
    const angle = Math.PI / 4 + index * (Math.PI / 2);
    const innerRadius = 5.5;
    const outerRadius = 8;
    context.beginPath();
    context.moveTo(
      target.x + Math.cos(angle) * innerRadius,
      target.y + Math.sin(angle) * innerRadius,
    );
    context.lineTo(
      target.x + Math.cos(angle) * outerRadius,
      target.y + Math.sin(angle) * outerRadius,
    );
    context.stroke();
  }

  context.restore();
}

function drawMissiles(
  context: CanvasRenderingContext2D,
  launches: Launch[],
  width: number,
  height: number,
  time: number,
  reducedMotion: boolean,
) {
  const frame = getMapFrame(width, height);

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const launch of launches) {
    drawLaunchOrigin(context, launch.origin);

    for (let index = 0; index < launch.destinations.length; index += 1) {
      const destinationCountry = launch.destinations[index];
      const [x, y] = projectCoordinate(
        [destinationCountry.longitude, destinationCountry.latitude],
        frame,
      );
      const destination = { x, y };
      const elapsed = time - launch.startedAt - index * MISSILE_STAGGER_MS;
      const duration = missileDuration(launch.origin, destination);
      const progress = Math.min(1, Math.max(0, elapsed / duration));
      const control = trajectoryControl(launch.origin, destination, index);

      if (reducedMotion) {
        context.strokeStyle = "rgba(153, 67, 49, 0.42)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(launch.origin.x, launch.origin.y);
        context.quadraticCurveTo(control.x, control.y, destination.x, destination.y);
        context.stroke();
        drawDestroyedTarget(context, destination);
        continue;
      }

      if (progress > 0 && progress < 1) {
        const missile = quadraticPoint(launch.origin, control, destination, progress);
        const trailStart = Math.max(0, progress - 0.2);
        const trail = quadraticPoint(launch.origin, control, destination, trailStart);

        context.strokeStyle = "rgba(153, 67, 49, 0.68)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(launch.origin.x, launch.origin.y);
        context.quadraticCurveTo(control.x, control.y, trail.x, trail.y);
        context.stroke();

        context.strokeStyle = "rgba(153, 67, 49, 0.94)";
        context.lineWidth = 1.25;
        context.beginPath();
        context.moveTo(trail.x, trail.y);
        context.lineTo(missile.x, missile.y);
        context.stroke();
      }

      const afterglow = elapsed - duration;
      if (afterglow >= 0 && afterglow < MISSILE_AFTERGLOW_MS) {
        drawImpact(
          context,
          destination,
          afterglow / MISSILE_AFTERGLOW_MS,
        );
      } else if (afterglow >= MISSILE_AFTERGLOW_MS) {
        drawDestroyedTarget(context, destination);
      }
    }
  }

  context.restore();
}

export default function SwarmThree() {
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const flockRef = useRef<Boid[]>([]);
  const launchesRef = useRef<Launch[]>([]);
  const nextLaunchIdRef = useRef(0);
  const weightsRef = useRef<RuleWeights>(DEFAULT_WEIGHTS);
  const pausedRef = useRef(false);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [paused, setPaused] = useState(false);

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
        launchesRef.current = launchesRef.current.map((launch) => ({
          ...launch,
          origin: {
            x: launch.origin.x * (bounds.width / oldBounds.width),
            y: launch.origin.y * (bounds.height / oldBounds.height),
          },
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
          launchesRef.current.map((launch) => launch.origin),
          getWorldConstraint(width, height),
        );
      }

      context.strokeStyle = "rgba(24, 25, 22, 0.78)";
      context.lineWidth = 1;
      context.lineCap = "round";
      drawFlock(context, flockRef.current);
      drawMissiles(
        context,
        launchesRef.current,
        width,
        height,
        time,
        reduceMotion.matches,
      );

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

  const launchAt = (origin: Point, width: number, height: number) => {
    const country = findCampaignAtPoint(origin.x, origin.y, width, height);
    const destinations = selectMissileDestinations(
      countryCoordinates,
      country?.id ?? null,
      MISSILES_PER_LAUNCH,
    );

    launchesRef.current = [
      ...launchesRef.current,
      {
        id: nextLaunchIdRef.current,
        origin,
        destinations,
        startedAt: performance.now(),
      },
    ];
    nextLaunchIdRef.current += 1;
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
        aria-label="World map with a moving immigrant flock. Click a point to launch missiles from it toward twenty other countries; the flock avoids each launch point."
        tabIndex={0}
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const origin = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };
          if (!isPointInsideWorld(origin.x, origin.y, bounds.width, bounds.height)) {
            return;
          }
          launchAt(origin, bounds.width, bounds.height);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const width = event.currentTarget.clientWidth;
          const height = event.currentTarget.clientHeight;
          const origin = { x: width / 2, y: height / 2 };
          if (isPointInsideWorld(origin.x, origin.y, width, height)) {
            launchAt(origin, width, height);
          }
        }}
      />

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
                launchesRef.current = [];
              }}
            >
              clear launches
            </button>
          </div>
        </section>
      </details>
    </main>
  );
}
