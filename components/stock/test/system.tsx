"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  indices,
  marketSession,
  news,
  optionsFlow,
  portfolio,
  riskMetrics,
  sectors,
  symbols,
  type MarketSymbol,
} from "./data";
import { AreaChart, Sparkline, signed, signedPercent } from "./primitives";

export type StockVariantId = "1" | "2" | "3" | "4" | "5";

type Palette = {
  bg: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  line: string;
  accent: string;
  accent2: string;
  positive: string;
  negative: string;
};

type VariantPreset = {
  id: StockVariantId;
  label: string;
  reference: string;
  premise: string;
  focusIndex: number;
  palette: Palette;
  radius: number;
  typeScale: number;
  chrome: "hard" | "soft" | "glass" | "instrument" | "brief";
};

type LabState = {
  morph: number;
  density: number;
  dataLens: number;
  signal: number;
};

type RenderContext = {
  state: LabState;
  presets: VariantPreset[];
  from: VariantPreset;
  to: VariantPreset;
  active: VariantPreset;
  mix: number;
  colors: Palette;
  radius: number;
  densityPx: number;
  typeScale: number;
  symbols: MarketSymbol[];
  focus: MarketSymbol;
};

const presets: VariantPreset[] = [
  {
    id: "1",
    label: "Terminal",
    reference: "terminal command center",
    premise: "Dense price discovery for a trader who wants the whole tape at once.",
    focusIndex: 0,
    radius: 0,
    typeScale: 1.02,
    chrome: "hard",
    palette: {
      bg: "#050607",
      surface: "#08100d",
      elevated: "#0c1713",
      text: "#f3fff8",
      muted: "#8fb6a2",
      line: "#254136",
      accent: "#7cffb2",
      accent2: "#ffcc66",
      positive: "#7cffb2",
      negative: "#ff5d8f",
    },
  },
  {
    id: "2",
    label: "Glass",
    reference: "consumer watchlist",
    premise: "A calm stock-service view where watchlist, chart, and story hierarchy do the work.",
    focusIndex: 1,
    radius: 8,
    typeScale: 0.96,
    chrome: "soft",
    palette: {
      bg: "#f5f7fb",
      surface: "#ffffff",
      elevated: "#eef3f8",
      text: "#111318",
      muted: "#687385",
      line: "#d9e1eb",
      accent: "#0b8f6f",
      accent2: "#2563eb",
      positive: "#10a66f",
      negative: "#d64550",
    },
  },
  {
    id: "3",
    label: "Wall",
    reference: "institutional graph wall",
    premise: "Large-format charting for comparing risk, breadth, and index context under pressure.",
    focusIndex: 2,
    radius: 2,
    typeScale: 1.08,
    chrome: "instrument",
    palette: {
      bg: "#090b10",
      surface: "#101621",
      elevated: "#151d2a",
      text: "#eef3f8",
      muted: "#8796aa",
      line: "#283345",
      accent: "#8fb8ff",
      accent2: "#14b8a6",
      positive: "#31d0aa",
      negative: "#f43f5e",
    },
  },
  {
    id: "4",
    label: "Flow",
    reference: "options flow cockpit",
    premise: "A derivatives cockpit where liquidity, gamma, and flow imbalance stay visible.",
    focusIndex: 3,
    radius: 1,
    typeScale: 1.04,
    chrome: "hard",
    palette: {
      bg: "#07100f",
      surface: "#0d1a18",
      elevated: "#112421",
      text: "#eafff8",
      muted: "#83a69d",
      line: "#21443d",
      accent: "#53ffd6",
      accent2: "#ff5d8f",
      positive: "#53ffd6",
      negative: "#ff5d8f",
    },
  },
  {
    id: "5",
    label: "Brief",
    reference: "portfolio brief",
    premise: "Executive allocation review with enough market detail to act without becoming noisy.",
    focusIndex: 4,
    radius: 0,
    typeScale: 0.98,
    chrome: "brief",
    palette: {
      bg: "#f7f9fb",
      surface: "#ffffff",
      elevated: "#e9eef4",
      text: "#17202a",
      muted: "#667482",
      line: "#d5dde7",
      accent: "#006fbf",
      accent2: "#17202a",
      positive: "#008f5d",
      negative: "#c63d4a",
    },
  },
];

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function mixHex(a: string, b: string, t: number) {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  const r = Math.round(ar.r + (br.r - ar.r) * t);
  const g = Math.round(ar.g + (br.g - ar.g) * t);
  const blue = Math.round(ar.b + (br.b - ar.b) * t);
  return `rgb(${r}, ${g}, ${blue})`;
}

function mixPalette(a: Palette, b: Palette, t: number): Palette {
  return {
    bg: mixHex(a.bg, b.bg, t),
    surface: mixHex(a.surface, b.surface, t),
    elevated: mixHex(a.elevated, b.elevated, t),
    text: mixHex(a.text, b.text, t),
    muted: mixHex(a.muted, b.muted, t),
    line: mixHex(a.line, b.line, t),
    accent: mixHex(a.accent, b.accent, t),
    accent2: mixHex(a.accent2, b.accent2, t),
    positive: mixHex(a.positive, b.positive, t),
    negative: mixHex(a.negative, b.negative, t),
  };
}

function withAlpha(color: string, alpha: number) {
  if (color.startsWith("#")) {
    const rgb = hexToRgb(color);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  const match = color.match(/\d+/g);
  if (!match || match.length < 3) {
    return color;
  }

  return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomLabState(): LabState {
  return {
    morph: Number((Math.random() * 4).toFixed(2)),
    dataLens: Math.random() * 100,
    density: 24 + Math.random() * 68,
    signal: 16 + Math.random() * 78,
  };
}

function easeToward(current: number, target: number, amount: number) {
  return current + (target - current) * amount;
}

function easeStateToward(current: LabState, target: LabState): LabState {
  return {
    morph: easeToward(current.morph, target.morph, 0.11),
    dataLens: easeToward(current.dataLens, target.dataLens, 0.09),
    density: easeToward(current.density, target.density, 0.08),
    signal: easeToward(current.signal, target.signal, 0.1),
  };
}

function projectSymbol(symbol: MarketSymbol, signal: number, index: number): MarketSymbol {
  const stress = (signal - 50) / 50;
  const base = symbol.series[0]?.value ?? symbol.price;
  const projectedSeries = symbol.series.map((point, pointIndex) => {
    const wave = Math.sin(pointIndex * 0.82 + index * 0.7) * stress * 0.24;
    const expansion = (point.value - base) * stress * 0.42;
    return {
      ...point,
      value: Number((point.value + expansion + wave).toFixed(2)),
      volume: Math.round(point.volume * (1 + Math.abs(stress) * 0.28)),
    };
  });
  const projectedPrice = projectedSeries.at(-1)?.value ?? symbol.price;
  const projectedChange = projectedPrice - base;

  return {
    ...symbol,
    price: projectedPrice,
    change: Number(projectedChange.toFixed(2)),
    changePercent: Number(((projectedChange / base) * 100).toFixed(2)),
    series: projectedSeries,
  };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function makeContext(state: LabState): RenderContext {
  const lower = Math.floor(clamp(state.morph, 0, 4));
  const upper = Math.min(4, lower + 1);
  const mix = clamp(state.morph - lower, 0, 1);
  const from = presets[lower];
  const to = presets[upper];
  const active = presets[Math.round(clamp(state.morph, 0, 4))];
  const projectedSymbols = symbols.map((symbol, index) =>
    projectSymbol(symbol, state.signal, index),
  );
  const focusIndex = Math.round((state.dataLens / 100) * (projectedSymbols.length - 1));
  const focus = projectedSymbols[clamp(focusIndex, 0, projectedSymbols.length - 1)];

  return {
    state,
    presets,
    from,
    to,
    active,
    mix,
    colors: mixPalette(from.palette, to.palette, mix),
    radius: from.radius + (to.radius - from.radius) * mix,
    densityPx: 10 + (100 - state.density) * 0.11,
    typeScale: from.typeScale + (to.typeScale - from.typeScale) * mix,
    symbols: projectedSymbols,
    focus,
  };
}

function Shell({
  ctx,
  children,
}: {
  ctx: RenderContext;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{
        backgroundColor: ctx.colors.bg,
        color: ctx.colors.text,
        fontSize: `${ctx.typeScale * 16}px`,
      }}
    >
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  readout,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  readout: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
        <span>{label}</span>
        <span className="opacity-60">{readout}</span>
      </span>
      <input
        className="h-1.5 w-full cursor-ew-resize appearance-none rounded-none bg-current/20 accent-current"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ControlDeck({
  ctx,
  randomizing,
  setRandomizing,
  setState,
}: {
  ctx: RenderContext;
  randomizing: boolean;
  setRandomizing: (value: boolean) => void;
  setState: React.Dispatch<React.SetStateAction<LabState>>;
}) {
  const swatches = Object.values(ctx.colors).slice(0, 6);

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-xl transition-colors duration-500"
      style={{
        backgroundColor: withAlpha(ctx.colors.bg, 0.92),
        borderColor: ctx.colors.line,
      }}
    >
      <div className="grid gap-4 px-4 py-3 md:px-6 xl:grid-cols-[190px_1fr_auto] xl:items-center">
        <div className="flex items-center justify-between gap-4 xl:block">
          <Link
            href="/stock/test"
            className="font-mono text-xs uppercase tracking-[0.24em]"
            style={{ color: ctx.colors.accent }}
          >
            Stock Lab
          </Link>
          <div className="mt-0 flex items-center gap-1 xl:mt-3" aria-label="Interpolated palette">
            {swatches.map((color) => (
              <span
                key={color}
                className="h-2.5 w-2.5 border"
                style={{ backgroundColor: color, borderColor: ctx.colors.line }}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Slider
            label="interface morph"
            min={0}
            max={4}
            step={0.01}
            value={ctx.state.morph}
            readout={`${ctx.from.label}${ctx.to.id !== ctx.from.id ? ` -> ${ctx.to.label}` : ""}`}
            onChange={(morph) => setState((state) => ({ ...state, morph }))}
          />
          <Slider
            label="data lens"
            value={ctx.state.dataLens}
            readout={ctx.focus.symbol}
            onChange={(dataLens) => setState((state) => ({ ...state, dataLens }))}
          />
          <Slider
            label="density"
            value={ctx.state.density}
            readout={ctx.state.density > 66 ? "compact" : ctx.state.density > 33 ? "balanced" : "loose"}
            onChange={(density) => setState((state) => ({ ...state, density }))}
          />
          <Slider
            label="signal stress"
            value={ctx.state.signal}
            readout={`${Math.round(ctx.state.signal)} tape`}
            onChange={(signal) => setState((state) => ({ ...state, signal }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <nav className="flex border font-mono text-xs" style={{ borderColor: ctx.colors.line }}>
            {presets.map((preset, index) => (
              <Link
                key={preset.id}
                href={`/stock/test/${preset.id}`}
                className="px-3 py-2 transition"
                style={{
                  backgroundColor:
                    ctx.active.id === preset.id ? ctx.colors.text : "transparent",
                  color: ctx.active.id === preset.id ? ctx.colors.bg : ctx.colors.text,
                  borderRight:
                    preset.id === "5" ? undefined : `1px solid ${ctx.colors.line}`,
                }}
              >
                {index + 1}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            aria-pressed={randomizing}
            className="border px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] transition"
            style={{
              borderColor: ctx.colors.line,
              backgroundColor: randomizing ? ctx.colors.accent : "transparent",
              color: randomizing ? ctx.colors.bg : ctx.colors.text,
            }}
            onClick={() => setRandomizing(!randomizing)}
          >
            {randomizing ? "hold" : "random morph"}
          </button>
        </div>
      </div>
    </header>
  );
}

function MiniSession({ ctx }: { ctx: RenderContext }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.15em]">
      <span>{marketSession.timestamp}</span>
      <span>{marketSession.venue}</span>
      <span>Liquidity {marketSession.liquidity}</span>
      <span>VIX {marketSession.vix}</span>
      <span style={{ color: ctx.colors.accent }}>{ctx.active.reference}</span>
    </div>
  );
}

function Signed({
  value,
  ctx,
}: {
  value: number;
  ctx: RenderContext;
}) {
  return (
    <span style={{ color: value >= 0 ? ctx.colors.positive : ctx.colors.negative }}>
      {signedPercent(value)}
    </span>
  );
}

function Panel({
  ctx,
  children,
  className = "",
  elevated = false,
}: {
  ctx: RenderContext;
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: elevated ? ctx.colors.elevated : ctx.colors.surface,
        borderColor: ctx.colors.line,
        borderRadius: ctx.radius,
        padding: ctx.densityPx + 8,
      }}
    >
      {children}
    </div>
  );
}

function AreaChartWithStyle({
  ctx,
  height,
}: {
  ctx: RenderContext;
  height: string;
}) {
  return (
    <div style={{ color: ctx.colors.line }}>
      <AreaChart
        symbol={ctx.focus}
        className="w-full"
        lineClassName=""
        lineColor={ctx.colors.accent}
        fill={withAlpha(ctx.colors.accent, 0.14)}
        style={{ height } as CSSProperties}
      />
    </div>
  );
}

function TerminalLayout({ ctx }: { ctx: RenderContext }) {
  return (
    <main>
      <section className="grid border-b lg:grid-cols-[1.55fr_0.85fr]" style={{ borderColor: ctx.colors.line }}>
        <div className="border-b p-4 md:p-6 lg:border-b-0 lg:border-r" style={{ borderColor: ctx.colors.line }}>
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4" style={{ color: ctx.colors.accent }}>
            <MiniSession ctx={ctx} />
            <span className="font-mono text-xs uppercase tracking-[0.2em]">{ctx.active.premise}</span>
          </div>
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: ctx.colors.accent2 }}>
                Primary tape
              </p>
              <h1 className="mt-3 text-6xl font-black leading-none md:text-8xl">
                {ctx.focus.symbol}
              </h1>
              <p className="mt-2 text-xl" style={{ color: ctx.colors.muted }}>{ctx.focus.name}</p>
            </div>
            <div className="font-mono md:text-right">
              <p className="text-5xl font-semibold">{ctx.focus.price.toFixed(2)}</p>
              <p className="mt-2 text-2xl" style={{ color: ctx.colors.positive }}>
                {signed(ctx.focus.change)} / {signedPercent(ctx.focus.changePercent)}
              </p>
            </div>
          </div>
          <AreaChartWithStyle ctx={ctx} height="330px" />
        </div>

        <aside className="grid content-start gap-px" style={{ backgroundColor: ctx.colors.line }}>
          {ctx.symbols.map((symbol) => (
            <article
              key={symbol.symbol}
              className="grid grid-cols-[1fr_100px] items-center gap-3 p-4"
              style={{ backgroundColor: ctx.colors.bg }}
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-mono text-2xl font-black">{symbol.symbol}</h2>
                  <span className="truncate text-sm" style={{ color: ctx.colors.muted }}>
                    {symbol.sector}
                  </span>
                </div>
                <p className="mt-2 font-mono text-sm">
                  {symbol.price.toFixed(2)} <Signed value={symbol.changePercent} ctx={ctx} />
                </p>
              </div>
              <Sparkline
                series={symbol.series}
                positive={symbol.change >= 0}
                className="h-12 w-full"
              />
            </article>
          ))}
        </aside>
      </section>

      <section className="grid border-b xl:grid-cols-[1fr_0.65fr]" style={{ borderColor: ctx.colors.line }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left font-mono">
            <thead>
              <tr className="border-b text-[11px] uppercase tracking-[0.16em]" style={{ borderColor: ctx.colors.line, color: ctx.colors.accent }}>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Last</th>
                <th className="px-4 py-3">Chg</th>
                <th className="px-4 py-3">Range</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Desk note</th>
              </tr>
            </thead>
            <tbody>
              {ctx.symbols.map((symbol) => (
                <tr key={symbol.symbol} className="border-b" style={{ borderColor: ctx.colors.line }}>
                  <td className="px-4 py-4 text-2xl font-black">{symbol.symbol}</td>
                  <td className="px-4 py-4">{symbol.price.toFixed(2)}</td>
                  <td className="px-4 py-4"><Signed value={symbol.changePercent} ctx={ctx} /></td>
                  <td className="px-4 py-4">{symbol.dayRange[0].toFixed(2)} / {symbol.dayRange[1].toFixed(2)}</td>
                  <td className="px-4 py-4">{symbol.volume}</td>
                  <td className="px-4 py-4" style={{ color: ctx.colors.muted }}>{symbol.sector}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SectorHeat ctx={ctx} />
      </section>
    </main>
  );
}

function GlassLayout({ ctx }: { ctx: RenderContext }) {
  const watchlist = ctx.symbols.filter((symbol) => symbol.symbol !== ctx.focus.symbol);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 md:grid-cols-[0.82fr_1.18fr] md:px-6 md:py-8">
      <aside className="grid content-start gap-3">
        <Panel ctx={ctx} className="border shadow-[0_18px_60px_rgba(34,42,62,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p style={{ color: ctx.colors.muted }}>Watchlist</p>
              <h1 className="mt-1 text-4xl font-semibold leading-tight">Today</h1>
            </div>
            <p className="px-3 py-2 text-sm" style={{ backgroundColor: ctx.colors.text, color: ctx.colors.bg, borderRadius: ctx.radius }}>
              Open
            </p>
          </div>
          <div className="mt-5 grid gap-2">
            {watchlist.map((symbol) => (
              <article
                key={symbol.symbol}
                className="grid grid-cols-[1fr_80px_72px] items-center gap-3 border p-3"
                style={{
                  backgroundColor: ctx.colors.elevated,
                  borderColor: ctx.colors.line,
                  borderRadius: ctx.radius,
                }}
              >
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{symbol.symbol}</h2>
                  <p className="truncate text-xs" style={{ color: ctx.colors.muted }}>{symbol.name}</p>
                </div>
                <Sparkline series={symbol.series} positive={symbol.change >= 0} className="h-9 w-full" strokeWidth={3} />
                <div className="text-right text-sm">
                  <p className="font-semibold">{symbol.price.toFixed(2)}</p>
                  <Signed value={symbol.changePercent} ctx={ctx} />
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel ctx={ctx} elevated className="border">
          <p style={{ color: ctx.colors.muted }}>Market stories</p>
          <div className="mt-4 grid gap-4">
            {news.slice(0, 3).map((item) => (
              <article key={item.headline} className="border-t pt-4" style={{ borderColor: ctx.colors.line }}>
                <p className="mb-2 text-xs" style={{ color: ctx.colors.muted }}>{item.time} / {item.source}</p>
                <h3 className="leading-tight">{item.headline}</h3>
              </article>
            ))}
          </div>
        </Panel>
      </aside>

      <section className="grid gap-4">
        <Panel ctx={ctx} className="overflow-hidden border shadow-[0_22px_80px_rgba(34,42,62,0.10)]">
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <p style={{ color: ctx.colors.muted }}>{ctx.focus.name}</p>
              <h2 className="mt-1 text-6xl font-semibold leading-none md:text-8xl">
                {ctx.focus.symbol}
              </h2>
            </div>
            <div className="sm:text-right">
              <p className="text-4xl font-semibold">{ctx.focus.price.toFixed(2)}</p>
              <p className="mt-1 text-xl" style={{ color: ctx.colors.positive }}>
                {signed(ctx.focus.change)} ({signedPercent(ctx.focus.changePercent)})
              </p>
            </div>
          </div>
          <div className="mt-7">
            <Sparkline series={ctx.focus.series} className="h-64 w-full" strokeWidth={4} />
          </div>
        </Panel>

        <div className="grid gap-4 md:grid-cols-3">
          {ctx.symbols.slice(0, 3).map((symbol) => (
            <Panel key={symbol.symbol} ctx={ctx} className="border">
              <p className="text-sm" style={{ color: ctx.colors.muted }}>{symbol.name}</p>
              <div className="mt-6 flex items-end justify-between gap-2">
                <span className="text-3xl font-semibold">{symbol.symbol}</span>
                <Signed value={symbol.changePercent} ctx={ctx} />
              </div>
            </Panel>
          ))}
        </div>
      </section>
    </main>
  );
}

function WallLayout({ ctx }: { ctx: RenderContext }) {
  return (
    <main className="grid min-h-[calc(100vh-120px)] lg:grid-cols-[72px_1fr_360px]">
      <aside className="hidden border-r lg:grid" style={{ borderColor: ctx.colors.line }}>
        {indices.map((index) => (
          <div key={index.label} className="flex items-center justify-center border-b [writing-mode:vertical-rl]" style={{ borderColor: ctx.colors.line }}>
            <span className="font-mono text-xs uppercase tracking-[0.22em]" style={{ color: ctx.colors.muted }}>
              {index.label} {index.value}
            </span>
          </div>
        ))}
      </aside>

      <section className="grid grid-rows-[auto_1fr_auto]">
        <div className="border-b p-5 md:p-7" style={{ borderColor: ctx.colors.line }}>
          <MiniSession ctx={ctx} />
          <div className="mt-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: ctx.colors.muted }}>
                Institutional graph wall
              </p>
              <h1 className="mt-3 text-6xl font-black leading-none md:text-9xl">
                {ctx.focus.symbol}
              </h1>
            </div>
            <div className="md:text-right">
              <p className="text-5xl font-semibold">{ctx.focus.price.toFixed(2)}</p>
              <p className="mt-2 text-2xl"><Signed value={ctx.focus.changePercent} ctx={ctx} /></p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden border-b p-4 md:p-7" style={{ borderColor: ctx.colors.line }}>
          <div className="absolute inset-y-0 left-1/2 w-px" style={{ backgroundColor: ctx.colors.line }} />
          <AreaChartWithStyle ctx={ctx} height="52vh" />
        </div>
        <div className="grid border-b md:grid-cols-4 lg:border-b-0" style={{ borderColor: ctx.colors.line }}>
          {riskMetrics.map((metric) => (
            <div key={metric.label} className="border-b p-4 md:border-b-0 md:border-r" style={{ borderColor: ctx.colors.line }}>
              <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: ctx.colors.muted }}>{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
              <p className="mt-1 text-sm" style={{ color: ctx.colors.accent }}>{metric.change}</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="grid content-start border-l" style={{ borderColor: ctx.colors.line }}>
        <SectorMatrix ctx={ctx} />
        <SymbolBook ctx={ctx} />
      </aside>
    </main>
  );
}

function FlowLayout({ ctx }: { ctx: RenderContext }) {
  return (
    <main className="grid border-b xl:grid-cols-[340px_1fr_360px]" style={{ borderColor: ctx.colors.line }}>
      <aside className="border-b p-4 md:p-6 xl:border-b-0 xl:border-r" style={{ borderColor: ctx.colors.line }}>
        <MiniSession ctx={ctx} />
        <h1 className="mt-10 text-5xl font-black leading-none md:text-7xl">Flow tape</h1>
        <p className="mt-4 max-w-sm text-lg leading-7" style={{ color: ctx.colors.muted }}>
          Live derivatives pressure, liquidity pockets, and single-name momentum.
        </p>
        <div className="mt-8 grid gap-3">
          {optionsFlow.map((flow) => (
            <article key={`${flow.time}-${flow.symbol}`} className="border p-3" style={{ backgroundColor: ctx.colors.surface, borderColor: ctx.colors.line }}>
              <div className="flex items-center justify-between font-mono text-xs" style={{ color: ctx.colors.accent }}>
                <span>{flow.time}</span>
                <span>{flow.expiry}</span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-black">{flow.symbol}</h2>
                  <p className="text-sm" style={{ color: ctx.colors.muted }}>{flow.side} / {flow.strike}</p>
                </div>
                <p style={{ color: flow.tone === "bullish" ? ctx.colors.positive : ctx.colors.negative }}>
                  {flow.premium}
                </p>
              </div>
            </article>
          ))}
        </div>
      </aside>

      <section className="p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: ctx.colors.accent }}>Volatility target</p>
            <h2 className="mt-3 text-7xl font-black leading-none md:text-9xl">{ctx.focus.symbol}</h2>
          </div>
          <div className="md:text-right">
            <p className="text-5xl font-semibold">{ctx.focus.price.toFixed(2)}</p>
            <p className="mt-2 text-2xl"><Signed value={ctx.focus.changePercent} ctx={ctx} /></p>
          </div>
        </div>
        <AreaChartWithStyle ctx={ctx} height="440px" />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {["Gamma wall", "Dealer vol", "Put skew"].map((label, index) => (
            <Panel key={label} ctx={ctx} elevated className="border">
              <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: ctx.colors.accent }}>
                {label} {index === 0 ? Math.round(ctx.focus.price / 5) * 5 : index === 1 ? "short" : "+4.1"}
              </p>
              <p className="mt-6 text-3xl font-semibold">{ctx.focus.volume}</p>
            </Panel>
          ))}
        </div>
      </section>

      <aside className="border-t p-4 md:p-6 xl:border-l xl:border-t-0" style={{ borderColor: ctx.colors.line }}>
        <SectorHeat ctx={ctx} />
        <div className="mt-8 grid gap-px p-px" style={{ backgroundColor: ctx.colors.line }}>
          {news.map((item) => (
            <article key={item.headline} className="p-4" style={{ backgroundColor: ctx.colors.bg }}>
              <p className="mb-2 font-mono text-xs" style={{ color: ctx.colors.accent }}>{item.time} / {item.impact}</p>
              <h3 className="leading-tight">{item.headline}</h3>
            </article>
          ))}
        </div>
      </aside>
    </main>
  );
}

function BriefLayout({ ctx }: { ctx: RenderContext }) {
  return (
    <main>
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel ctx={ctx} className="grid content-between gap-8 border">
          <div>
            <MiniSession ctx={ctx} />
            <h1 className="mt-12 max-w-4xl text-6xl font-semibold leading-none md:text-8xl">
              Portfolio command brief
            </h1>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {riskMetrics.map((metric) => (
              <article key={metric.label} className="border-t pt-4" style={{ borderColor: ctx.colors.line }}>
                <p className="text-sm" style={{ color: ctx.colors.muted }}>{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-sm" style={{ color: ctx.colors.accent }}>{metric.change}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel ctx={ctx} elevated className="border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p style={{ color: ctx.colors.muted }}>Risk anchor</p>
              <h2 className="mt-2 text-5xl font-semibold">{ctx.focus.symbol}</h2>
            </div>
            <div className="text-right">
              <p className="text-4xl font-semibold">{ctx.focus.price.toFixed(2)}</p>
              <p className="mt-1"><Signed value={ctx.focus.changePercent} ctx={ctx} /></p>
            </div>
          </div>
          <AreaChartWithStyle ctx={ctx} height="288px" />
        </Panel>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-8 md:px-6 xl:grid-cols-[1fr_360px]">
        <div className="border" style={{ backgroundColor: ctx.colors.surface, borderColor: ctx.colors.line }}>
          <div className="grid border-b p-4 md:grid-cols-[1fr_auto] md:items-center" style={{ borderColor: ctx.colors.line }}>
            <h2 className="text-3xl font-semibold">Allocation</h2>
            <p className="text-sm" style={{ color: ctx.colors.muted }}>$30.4M gross exposure</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b text-sm" style={{ borderColor: ctx.colors.line, color: ctx.colors.muted }}>
                  <th className="px-4 py-3 font-medium">Sleeve</th>
                  <th className="px-4 py-3 font-medium">Weight</th>
                  <th className="px-4 py-3 font-medium">P/L</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Exposure</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((item) => (
                  <tr key={item.sleeve} className="border-b last:border-b-0" style={{ borderColor: ctx.colors.line }}>
                    <td className="px-4 py-4 text-xl font-semibold">{item.sleeve}</td>
                    <td className="px-4 py-4">
                      <span className="inline-grid w-40 grid-cols-[1fr_42px] items-center gap-3">
                        <span className="h-2" style={{ backgroundColor: ctx.colors.elevated }}>
                          <span className="block h-full" style={{ width: `${item.weight}%`, backgroundColor: ctx.colors.accent2 }} />
                        </span>
                        <span>{item.weight}%</span>
                      </span>
                    </td>
                    <td className="px-4 py-4"><Signed value={item.pnl} ctx={ctx} /></td>
                    <td className="px-4 py-4">{item.risk}</td>
                    <td className="px-4 py-4">{item.exposure}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="grid gap-6">
          <SectorHeat ctx={ctx} />
          <SymbolBook ctx={ctx} />
        </aside>
      </section>
    </main>
  );
}

function SectorHeat({ ctx }: { ctx: RenderContext }) {
  return (
    <Panel ctx={ctx} className="border" elevated>
      <h2 className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: ctx.colors.accent }}>
        Sector heat
      </h2>
      <div className="mt-5 grid gap-3">
        {sectors.map((sector) => (
          <div key={sector.name} className="grid grid-cols-[84px_1fr_74px] items-center gap-3 font-mono text-sm">
            <span>{sector.name}</span>
            <span className="h-2" style={{ backgroundColor: ctx.colors.line }}>
              <span
                className="block h-full"
                style={{
                  width: `${sector.breadth}%`,
                  backgroundColor: sector.change >= 0 ? ctx.colors.positive : ctx.colors.negative,
                }}
              />
            </span>
            <Signed value={sector.change} ctx={ctx} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SectorMatrix({ ctx }: { ctx: RenderContext }) {
  return (
    <div className="border-b p-5" style={{ borderColor: ctx.colors.line }}>
      <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: ctx.colors.muted }}>
        Breadth matrix
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {sectors.map((sector) => (
          <div
            key={sector.name}
            className="border p-3"
            style={{
              borderColor: ctx.colors.line,
              backgroundColor:
                sector.change >= 0
                  ? withAlpha(ctx.colors.positive, 0.1)
                  : withAlpha(ctx.colors.negative, 0.1),
            }}
          >
            <p className="text-sm" style={{ color: ctx.colors.muted }}>{sector.name}</p>
            <p className="mt-4 text-3xl font-semibold"><Signed value={sector.change} ctx={ctx} /></p>
            <p className="mt-1 font-mono text-xs" style={{ color: ctx.colors.muted }}>{sector.flows}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SymbolBook({ ctx }: { ctx: RenderContext }) {
  return (
    <div className="grid gap-px p-px" style={{ backgroundColor: ctx.colors.line }}>
      {ctx.symbols.map((symbol) => (
        <article
          key={symbol.symbol}
          className="grid grid-cols-[1fr_auto] p-4"
          style={{ backgroundColor: ctx.colors.surface }}
        >
          <div>
            <h2 className="text-2xl font-semibold">{symbol.symbol}</h2>
            <p className="text-sm" style={{ color: ctx.colors.muted }}>{symbol.name}</p>
          </div>
          <div className="text-right">
            <p>{symbol.price.toFixed(2)}</p>
            <Signed value={symbol.changePercent} ctx={ctx} />
          </div>
        </article>
      ))}
    </div>
  );
}

const layoutRenderers = [
  TerminalLayout,
  GlassLayout,
  WallLayout,
  FlowLayout,
  BriefLayout,
] as const;

function MorphStage({ ctx }: { ctx: RenderContext }) {
  const lower = Math.floor(clamp(ctx.state.morph, 0, 4));
  const upper = Math.min(4, lower + 1);
  const LowerLayout = layoutRenderers[lower];
  const UpperLayout = layoutRenderers[upper];

  if (lower === upper || ctx.mix < 0.01) {
    return <LowerLayout ctx={ctx} />;
  }

  if (ctx.mix > 0.99) {
    return <UpperLayout ctx={ctx} />;
  }

  return (
    <div className="grid">
      <div
        className="[grid-area:1/1] transition-opacity duration-300"
        style={{ opacity: 1 - ctx.mix, pointerEvents: ctx.mix < 0.5 ? "auto" : "none" }}
        aria-hidden={ctx.mix >= 0.5}
      >
        <LowerLayout ctx={ctx} />
      </div>
      <div
        className="[grid-area:1/1] transition-opacity duration-300"
        style={{ opacity: ctx.mix, pointerEvents: ctx.mix >= 0.5 ? "auto" : "none" }}
        aria-hidden={ctx.mix < 0.5}
      >
        <UpperLayout ctx={ctx} />
      </div>
    </div>
  );
}

export default function StockMorphLab({
  initialVariant,
}: {
  initialVariant: StockVariantId;
}) {
  const initialIndex = Math.max(0, presets.findIndex((preset) => preset.id === initialVariant));
  const reducedMotion = useReducedMotion();
  const [randomizing, setRandomizing] = useState(false);
  const targetState = useRef<LabState | null>(null);
  const nextTargetAt = useRef(0);
  const lastCommitAt = useRef(0);
  const [state, setState] = useState<LabState>(() => ({
    morph: initialIndex,
    density: initialIndex === 0 || initialIndex === 3 ? 76 : initialIndex === 4 ? 42 : 58,
    dataLens: (presets[initialIndex].focusIndex / (symbols.length - 1)) * 100,
    signal: initialIndex === 3 ? 74 : initialIndex === 4 ? 38 : 55,
  }));
  const ctx = useMemo(() => makeContext(state), [state]);

  useEffect(() => {
    if (!randomizing) return;

    if (reducedMotion) {
      const timer = window.setInterval(() => {
        setState(randomLabState());
      }, 1400);
      return () => window.clearInterval(timer);
    }

    let frame = 0;
    const tick = (now: number) => {
      if (!targetState.current || now >= nextTargetAt.current) {
        targetState.current = randomLabState();
        nextTargetAt.current = now + 900 + Math.random() * 1250;
      }

      if (now - lastCommitAt.current > 58) {
        setState((current) => easeStateToward(current, targetState.current ?? current));
        lastCommitAt.current = now;
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [randomizing, reducedMotion]);

  return (
    <Shell ctx={ctx}>
      <ControlDeck
        ctx={ctx}
        randomizing={randomizing}
        setRandomizing={setRandomizing}
        setState={setState}
      />
      <MorphStage ctx={ctx} />
    </Shell>
  );
}
