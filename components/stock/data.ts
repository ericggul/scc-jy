export type PricePoint = {
  time: string;
  value: number;
  volume: number;
};

export type MarketSymbol = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayRange: [number, number];
  sector: string;
  volume: string;
  series: PricePoint[];
};

export type SectorPulse = {
  name: string;
  change: number;
  breadth: number;
  flows: string;
};

export type MarketNews = {
  time: string;
  source: string;
  headline: string;
  impact: "high" | "medium" | "low";
};

const times = [
  "09:30",
  "09:50",
  "10:10",
  "10:30",
  "10:50",
  "11:10",
  "11:30",
  "11:50",
  "12:10",
  "12:30",
  "12:50",
  "13:10",
  "13:30",
  "13:50",
  "14:10",
  "14:30",
  "14:50",
  "15:10",
  "15:30",
  "15:50",
] as const;

function makeSeries(values: number[], volumeBase: number): PricePoint[] {
  return values.map((value, index) => ({
    time: times[index],
    value,
    volume: volumeBase + ((index * 37) % 9) * 8 + index * 3,
  }));
}

export const marketSession = {
  title: "US equity session",
  timestamp: "15:58:24 ET",
  venue: "NYSE / Nasdaq composite tape",
  liquidity: "$18.4B",
  advanceDecline: "3.1 : 2",
  vix: "13.9",
  fedWatch: "Sep cut odds 41%",
};

export const indices = [
  { label: "S&P 500", value: "6,128.44", change: 0.74 },
  { label: "Nasdaq 100", value: "22,084.19", change: 1.16 },
  { label: "Dow", value: "43,902.10", change: 0.28 },
  { label: "Russell 2000", value: "2,386.73", change: -0.31 },
] as const;

export const symbols: MarketSymbol[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA",
    price: 154.88,
    change: 4.76,
    changePercent: 3.17,
    dayRange: [148.04, 155.42],
    sector: "Semiconductors",
    volume: "62.1M",
    series: makeSeries(
      [
        149.4, 150.1, 150.0, 151.3, 151.1, 152.6, 152.1, 153.2, 152.8, 153.9,
        154.2, 153.7, 154.8, 154.4, 155.0, 154.6, 155.2, 154.9, 155.4, 154.88,
      ],
      220,
    ),
  },
  {
    symbol: "AAPL",
    name: "Apple",
    price: 226.42,
    change: 2.18,
    changePercent: 0.97,
    dayRange: [222.81, 227.05],
    sector: "Consumer technology",
    volume: "44.8M",
    series: makeSeries(
      [
        223.8, 224.4, 224.0, 224.8, 225.2, 224.7, 225.6, 225.9, 225.1, 225.8,
        226.1, 226.7, 226.3, 226.0, 226.5, 226.9, 226.2, 226.8, 227.0, 226.42,
      ],
      160,
    ),
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    price: 512.09,
    change: 6.42,
    changePercent: 1.27,
    dayRange: [503.90, 513.74],
    sector: "Cloud software",
    volume: "28.5M",
    series: makeSeries(
      [
        505.6, 506.8, 506.1, 507.4, 508.0, 508.9, 507.8, 509.6, 510.2, 509.7,
        510.9, 511.8, 511.1, 512.5, 511.7, 512.9, 513.4, 512.7, 513.1, 512.09,
      ],
      112,
    ),
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    price: 318.36,
    change: -5.72,
    changePercent: -1.77,
    dayRange: [315.62, 326.10],
    sector: "Autos",
    volume: "73.4M",
    series: makeSeries(
      [
        324.8, 325.5, 323.9, 322.4, 321.6, 322.8, 320.9, 321.4, 319.8, 320.5,
        319.2, 318.6, 319.0, 317.8, 318.4, 317.2, 316.8, 317.9, 318.7, 318.36,
      ],
      260,
    ),
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase",
    price: 286.74,
    change: 1.11,
    changePercent: 0.39,
    dayRange: [284.02, 288.18],
    sector: "Financials",
    volume: "13.7M",
    series: makeSeries(
      [
        285.1, 285.4, 285.0, 285.8, 286.2, 286.0, 286.5, 286.9, 286.3, 287.2,
        286.8, 287.4, 287.0, 287.6, 286.9, 287.1, 286.6, 286.8, 287.0, 286.74,
      ],
      82,
    ),
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil",
    price: 112.31,
    change: -0.86,
    changePercent: -0.76,
    dayRange: [111.88, 113.60],
    sector: "Energy",
    volume: "19.2M",
    series: makeSeries(
      [
        113.2, 113.0, 112.7, 112.9, 112.4, 112.1, 112.5, 112.2, 112.0, 112.3,
        112.7, 112.4, 112.2, 112.0, 112.1, 111.9, 112.2, 112.5, 112.0, 112.31,
      ],
      96,
    ),
  },
];

export const sectors: SectorPulse[] = [
  { name: "Semis", change: 2.48, breadth: 78, flows: "+$2.8B" },
  { name: "Cloud", change: 1.33, breadth: 64, flows: "+$940M" },
  { name: "Banks", change: 0.41, breadth: 55, flows: "+$310M" },
  { name: "Retail", change: -0.22, breadth: 47, flows: "-$120M" },
  { name: "Energy", change: -0.81, breadth: 39, flows: "-$680M" },
  { name: "Autos", change: -1.46, breadth: 31, flows: "-$1.1B" },
];

export const news: MarketNews[] = [
  {
    time: "15:47",
    source: "Macro desk",
    headline: "Treasury curve bull-steepens after softer payroll revisions.",
    impact: "high",
  },
  {
    time: "15:21",
    source: "Semis",
    headline: "AI infrastructure basket breaks above last month volume shelf.",
    impact: "high",
  },
  {
    time: "14:58",
    source: "Energy",
    headline: "Crude slips as inventory build offsets Middle East risk premium.",
    impact: "medium",
  },
  {
    time: "14:11",
    source: "Consumer",
    headline: "Discretionary names fade into close while mega-cap tech holds bid.",
    impact: "medium",
  },
];

export const optionsFlow = [
  { time: "15:52:09", symbol: "NVDA", side: "Call sweep", strike: "160", expiry: "07/17", premium: "$18.6M", tone: "bullish" },
  { time: "15:48:31", symbol: "TSLA", side: "Put block", strike: "310", expiry: "07/10", premium: "$9.4M", tone: "bearish" },
  { time: "15:44:18", symbol: "AAPL", side: "Call spread", strike: "230/240", expiry: "08/21", premium: "$7.1M", tone: "bullish" },
  { time: "15:36:42", symbol: "XOM", side: "Put sweep", strike: "110", expiry: "07/17", premium: "$3.8M", tone: "bearish" },
] as const;

export const portfolio = [
  { sleeve: "Core growth", weight: 42, pnl: 1.84, risk: "Moderate", exposure: "$12.8M" },
  { sleeve: "AI infrastructure", weight: 24, pnl: 3.62, risk: "High", exposure: "$7.4M" },
  { sleeve: "Quality income", weight: 18, pnl: 0.34, risk: "Low", exposure: "$5.5M" },
  { sleeve: "Macro hedge", weight: 11, pnl: -0.28, risk: "Low", exposure: "$3.2M" },
  { sleeve: "Cash", weight: 5, pnl: 0.0, risk: "None", exposure: "$1.5M" },
] as const;

export const riskMetrics = [
  { label: "Net exposure", value: "82%", change: "+4%" },
  { label: "Beta", value: "1.08", change: "-0.02" },
  { label: "VaR 95", value: "$1.42M", change: "+$90K" },
  { label: "Sharpe YTD", value: "1.71", change: "+0.14" },
] as const;

