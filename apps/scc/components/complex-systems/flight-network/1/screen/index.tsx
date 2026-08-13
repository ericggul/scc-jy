"use client";

import { useEffect, useRef, useState } from "react";
import {
  createFlightWorld,
  findCity,
  findRoute,
  pulseCityDemand,
  stepFlightWorld,
  type City,
  type Flight,
  type FlightWorld,
} from "../model";
import {
  curvedRoutePoint,
  projectedPoint,
  syntheticLandmasses,
  wrappedTarget,
} from "../map/geometry";
import styles from "./flight-network.module.css";

type Selection = { kind: "city" | "flight"; id: string } | null;

function routeBend(id: string) {
  return id.length % 2 === 0 ? 1 : -1;
}

function drawRoutePath(
  context: CanvasRenderingContext2D,
  source: City,
  target: City,
  width: number,
  height: number,
  bend: number,
) {
  const wrapped = wrappedTarget(source, target);
  const middle = curvedRoutePoint(source, target, 0.5, bend).point;
  const copies = [-1, 0, 1];
  for (const offset of copies) {
    context.beginPath();
    context.moveTo((source.x + offset) * width, source.y * height);
    context.quadraticCurveTo(
      (middle.x + offset) * width,
      middle.y * height,
      (wrapped.x + offset) * width,
      wrapped.y * height,
    );
    context.stroke();
  }
}

function flightScreenPoint(
  flight: Flight,
  cityById: ReadonlyMap<string, City>,
  width: number,
  height: number,
) {
  const source = cityById.get(flight.source);
  const target = cityById.get(flight.target);
  if (!source || !target) return null;
  const result = curvedRoutePoint(source, target, flight.progress, routeBend(flight.routeId));
  const wrappedX = ((result.point.x % 1) + 1) % 1;
  return { x: wrappedX * width, y: result.point.y * height, angle: result.angle };
}

function drawWorld(
  context: CanvasRenderingContext2D,
  world: FlightWorld,
  selection: Selection,
) {
  const width = context.canvas.clientWidth;
  const height = context.canvas.clientHeight;
  const cityById = new Map(world.cities.map((city) => [city.id, city]));
  context.clearRect(0, 0, width, height);
  context.lineJoin = "round";
  context.lineCap = "round";

  context.fillStyle = "#c9d8dc";
  context.fillRect(0, 0, width, height);
  for (const landmass of syntheticLandmasses) {
    const first = landmass[0];
    if (!first) continue;
    context.beginPath();
    context.moveTo(first.x * width, first.y * height);
    for (const point of landmass.slice(1)) context.lineTo(point.x * width, point.y * height);
    context.closePath();
    context.fillStyle = "#e5e4da";
    context.fill();
    context.strokeStyle = "rgba(73, 91, 86, 0.4)";
    context.lineWidth = 0.7;
    context.stroke();
  }

  for (const route of world.routes) {
    const source = cityById.get(route.source);
    const target = cityById.get(route.target);
    if (!source || !target) continue;
    context.strokeStyle = route.age < 3
      ? "rgba(179, 91, 50, 0.58)"
      : `rgba(41, 61, 61, ${0.06 + route.viability * 0.18})`;
    context.lineWidth = 0.45 + route.loadFactor * 0.7;
    drawRoutePath(context, source, target, width, height, routeBend(route.id));
  }

  for (const city of world.cities) {
    const point = projectedPoint(city, width, height);
    if (city.demandPulse > 0.02) {
      context.beginPath();
      context.arc(point.x, point.y, 11 + city.demandPulse * 12, 0, Math.PI * 2);
      context.strokeStyle = `rgba(179, 91, 50, ${Math.min(0.48, city.demandPulse * 0.42)})`;
      context.lineWidth = 1;
      context.stroke();
    }
    context.beginPath();
    context.arc(point.x, point.y, 2.5 + city.accessibility * 3.2, 0, Math.PI * 2);
    context.fillStyle = selection?.kind === "city" && selection.id === city.id
      ? "#b35b32"
      : "#17201c";
    context.fill();
    context.fillStyle = "rgba(23, 32, 28, 0.8)";
    context.font = "9px ui-monospace, monospace";
    context.fillText(city.code, point.x + 7, point.y + 3);
  }

  for (const flight of world.flights) {
    const point = flightScreenPoint(flight, cityById, width, height);
    if (!point) continue;
    const selected = selection?.kind === "flight" && selection.id === flight.id;
    context.save();
    context.translate(point.x, point.y);
    context.rotate(point.angle);
    context.beginPath();
    context.moveTo(7.5, 0);
    context.lineTo(-4.5, -3.2);
    context.lineTo(-2.2, 0);
    context.lineTo(-4.5, 3.2);
    context.closePath();
    context.fillStyle = selected ? "#b35b32" : "#d0a520";
    context.fill();
    if (selected) {
      context.strokeStyle = "#17201c";
      context.lineWidth = 1;
      context.stroke();
    }
    context.restore();
  }
}

function worldClock(hours: number) {
  const day = Math.floor(hours / 24) + 1;
  const hour = Math.floor(hours % 24).toString().padStart(2, "0");
  const minute = Math.floor((hours % 1) * 60).toString().padStart(2, "0");
  return `day ${day} / ${hour}:${minute}`;
}

function SelectedDetails({ world, selection }: { world: FlightWorld; selection: Selection }) {
  if (!selection) return null;
  if (selection.kind === "city") {
    const city = findCity(world, selection.id);
    if (!city) return null;
    const routes = world.routes.filter((route) => route.source === city.id || route.target === city.id);
    return (
      <aside className={styles.details} aria-label={`${city.name} details`}>
        <strong>{city.code} / {city.name}</strong>
        <dl>
          <div><dt>routes</dt><dd>{routes.length}</dd></div>
          <div><dt>access</dt><dd>{Math.round(city.accessibility * 100)}</dd></div>
          <div><dt>congestion</dt><dd>{Math.round(city.congestion * 100)}</dd></div>
          <div><dt>appeal</dt><dd>{Math.round(city.appeal * 100)}</dd></div>
        </dl>
      </aside>
    );
  }
  const flight = world.flights.find((candidate) => candidate.id === selection.id);
  if (!flight) return null;
  const source = findCity(world, flight.source);
  const target = findCity(world, flight.target);
  const route = findRoute(world, flight.routeId);
  return (
    <aside className={styles.details} aria-label={`${flight.callsign} details`}>
      <strong>{flight.callsign}</strong>
      <p>{source?.code} → {target?.code}</p>
      <dl>
        <div><dt>progress</dt><dd>{Math.round(flight.progress * 100)}%</dd></div>
        <div><dt>passengers</dt><dd>{flight.passengers}/{flight.capacity}</dd></div>
        <div><dt>fare</dt><dd>${Math.round(flight.fare)}</dd></div>
        <div><dt>next seats</dt><dd>{route ? Math.max(0, route.capacity - Math.floor(route.booked)) : 0}</dd></div>
      </dl>
    </aside>
  );
}

export default function FlightNetworkScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const [snapshot, setSnapshot] = useState(() => createFlightWorld());
  const worldRef = useRef(snapshot);
  const selectionRef = useRef<Selection>(null);
  const pausedRef = useRef(false);
  const speedRef = useRef(1);
  const seedRef = useRef(0x51f15e);
  const [selection, setSelection] = useState<Selection>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previous = performance.now();
    let readoutAt = previous;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawWorld(context, worldRef.current, selectionRef.current);
    };

    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (!pausedRef.current && !reduceMotion.matches) {
        worldRef.current = stepFlightWorld(
          worldRef.current,
          delta,
          2.4 * speedRef.current,
        ).world;
      }
      if (
        selectionRef.current?.kind === "flight" &&
        !worldRef.current.flights.some((flight) => flight.id === selectionRef.current?.id)
      ) {
        selectionRef.current = null;
        setSelection(null);
      }
      drawWorld(context, worldRef.current, selectionRef.current);
      if (now - readoutAt > 240) {
        setSnapshot(worldRef.current);
        readoutAt = now;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const selectAt = (x: number, y: number, width: number, height: number) => {
    const cityById = new Map(worldRef.current.cities.map((city) => [city.id, city]));
    const flight = worldRef.current.flights
      .map((candidate) => ({
        candidate,
        point: flightScreenPoint(candidate, cityById, width, height),
      }))
      .filter((entry) => entry.point)
      .sort((first, second) => {
        const firstDistance = Math.hypot((first.point?.x ?? 0) - x, (first.point?.y ?? 0) - y);
        const secondDistance = Math.hypot((second.point?.x ?? 0) - x, (second.point?.y ?? 0) - y);
        return firstDistance - secondDistance;
      })[0];
    if (flight?.point && Math.hypot(flight.point.x - x, flight.point.y - y) < 15) {
      setSelection({ kind: "flight", id: flight.candidate.id });
      return;
    }
    const city = worldRef.current.cities
      .map((candidate) => ({
        candidate,
        distance: Math.hypot(candidate.x * width - x, candidate.y * height - y),
      }))
      .sort((first, second) => first.distance - second.distance)[0];
    setSelection(city && city.distance < 16 ? { kind: "city", id: city.candidate.id } : null);
  };

  const reset = () => {
    seedRef.current = (seedRef.current + 0x9e3779b9) >>> 0;
    worldRef.current = createFlightWorld(seedRef.current);
    setSelection(null);
    setSnapshot(worldRef.current);
  };

  const pulseSelectedCity = () => {
    if (selection?.kind !== "city") return;
    worldRef.current = pulseCityDemand(worldRef.current, selection.id);
    setSnapshot(worldRef.current);
  };

  const openTickets = snapshot.routes.reduce(
    (total, route) => total + Math.max(0, route.capacity - Math.floor(route.booked)),
    0,
  );

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label="A synthetic world flight map. Cities create demand, routes open and close, and aircraft depart, travel, arrive, and disappear. Select a city or aircraft for details."
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          selectAt(
            event.clientX - bounds.left,
            event.clientY - bounds.top,
            bounds.width,
            bounds.height,
          );
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const firstFlight = worldRef.current.flights[0];
          setSelection(firstFlight
            ? { kind: "flight", id: firstFlight.id }
            : { kind: "city", id: worldRef.current.cities[0].id });
        }}
      />

      <header className={styles.header}>
        <h1>flight network</h1>
        <p>synthetic world / {worldClock(snapshot.elapsedHours)}</p>
      </header>

      <SelectedDetails world={snapshot} selection={selection} />

      <section className={styles.readout} aria-label="Air network activity">
        <dl>
          <div><dt>airborne</dt><dd>{snapshot.flights.length}</dd></div>
          <div><dt>routes</dt><dd>{snapshot.routes.length}</dd></div>
          <div><dt>tickets</dt><dd>{openTickets}</dd></div>
          <div><dt>arrivals</dt><dd>{snapshot.totals.arrived}</dd></div>
        </dl>
        <div className={styles.actions}>
          {selection?.kind === "city" && (
            <button type="button" onClick={pulseSelectedCity}>raise demand</button>
          )}
          <button type="button" onClick={() => setSpeed((current) => current === 1 ? 4 : 1)}>
            {speed}× time
          </button>
          <button type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "continue" : "pause"}
          </button>
          <button type="button" onClick={reset}>reset</button>
        </div>
      </section>
    </main>
  );
}
