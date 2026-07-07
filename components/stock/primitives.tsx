import Link from "next/link";
import type { CSSProperties } from "react";
import {
  indices,
  marketSession,
  stockPalettes,
  type MarketSymbol,
  type PricePoint,
} from "./data";

export function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

export function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function pointString(series: PricePoint[], width: number, height: number, pad = 4) {
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;

  return series
    .map((point, index) => {
      const x = pad + (index / (series.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (point.value - min) / spread) * (height - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function Sparkline({
  series,
  positive = true,
  className = "",
  strokeWidth = 2.5,
}: {
  series: PricePoint[];
  positive?: boolean;
  className?: string;
  strokeWidth?: number;
}) {
  const width = 180;
  const height = 64;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label="Intraday price line">
      <polyline
        points={pointString(series, width, height)}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        className={positive ? "text-emerald-400" : "text-rose-400"}
      />
    </svg>
  );
}

export function AreaChart({
  symbol,
  className = "",
  style,
  lineClassName = "text-cyan-300",
  lineColor,
  fill = "rgba(103, 232, 249, 0.15)",
}: {
  symbol: MarketSymbol;
  className?: string;
  style?: CSSProperties;
  lineClassName?: string;
  lineColor?: string;
  fill?: string;
}) {
  const width = 900;
  const height = 340;
  const line = pointString(symbol.series, width, height, 18);
  const area = `18,322 ${line} 882,322`;
  const volumeMax = Math.max(...symbol.series.map((point) => point.volume));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={style}
      role="img"
      aria-label={`${symbol.symbol} intraday price chart`}
    >
      <defs>
        <pattern id={`grid-${symbol.symbol}`} width="90" height="68" patternUnits="userSpaceOnUse">
          <path d="M 90 0 L 0 0 0 68" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#grid-${symbol.symbol})`} className="text-current" />
      <polygon points={area} fill={fill} />
      {symbol.series.map((point, index) => {
        const barHeight = (point.volume / volumeMax) * 52;
        const x = 24 + index * ((width - 48) / (symbol.series.length - 1));
        return (
          <rect
            key={point.time}
            x={x - 5}
            y={height - 20 - barHeight}
            width="6"
            height={barHeight}
            className="fill-current opacity-20"
          />
        );
      })}
      <polyline
        points={line}
        fill="none"
        stroke={lineColor ?? "currentColor"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
        className={lineClassName}
      />
    </svg>
  );
}

export function StockTopbar({ current = "1" }: { current?: string }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-current/15 px-4 py-3 text-sm md:px-6">
      <Link href="/stock" className="font-mono text-xs uppercase tracking-[0.28em]">
        Stock Lab
      </Link>
      <nav className="flex items-center gap-1 font-mono text-xs" aria-label="Stock interface variants">
        {["1", "2", "3", "4", "5"].map((slug) => (
          <Link
            key={slug}
            href={`/stock/${slug}`}
            className={`px-2.5 py-1 transition ${
              current === slug ? "bg-current text-white mix-blend-difference" : "opacity-65 hover:opacity-100"
            }`}
          >
            {slug}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function VariantSignature({ slug }: { slug: keyof typeof stockPalettes }) {
  const palette = stockPalettes[slug];

  return (
    <div className="flex items-center gap-1" aria-label={`${palette.name} palette`}>
      {palette.colors.map((color) => (
        <span
          key={color}
          className="h-2.5 w-2.5 border border-current/20"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

export function IndexTape({ className = "" }: { className?: string }) {
  return (
    <div className={`grid gap-px overflow-hidden ${className} sm:grid-cols-2 lg:grid-cols-4`}>
      {indices.map((index) => (
        <div key={index.label} className="grid gap-1 bg-current/5 p-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">
            {index.label}
          </span>
          <span className="text-2xl font-semibold leading-none">{index.value}</span>
          <span className={index.change >= 0 ? "text-emerald-500" : "text-rose-500"}>
            {signedPercent(index.change)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SessionLine({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] ${className}`}>
      <span>{marketSession.timestamp}</span>
      <span>{marketSession.venue}</span>
      <span>Liquidity {marketSession.liquidity}</span>
      <span>A/D {marketSession.advanceDecline}</span>
      <span>VIX {marketSession.vix}</span>
    </div>
  );
}

export function ChangeText({ value }: { value: number }) {
  return (
    <span className={value >= 0 ? "text-emerald-500" : "text-rose-500"}>
      {signedPercent(value)}
    </span>
  );
}
