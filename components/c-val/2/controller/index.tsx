"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  createInitialCValSnapshot,
  type CValBookLevel,
  type CValOrder,
  type CValSnapshot,
  type CValTrade,
} from "@/components/c-val/2/model";
import { useCValSocket } from "@/components/c-val/2/transport";
import { CValBloombergWorkstationFrame } from "@/components/c-val/2/visual";
import styles from "./controller.module.css";

type VisualProperties = CSSProperties & Record<`--${string}`, string>;

const participantNames: Record<string, string> = {
  "liquidity-provider": "LIQUIDITY PROVIDER",
  fundamental: "VALUE INVESTOR",
  trend: "TREND FOLLOWER",
  noise: "FLOW TRADER",
};

function participantLabel(type: string) {
  return participantNames[type] ?? type.toUpperCase();
}

function signed(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function tone(value: number) {
  if (value > 0.0005) return styles.positive;
  if (value < -0.0005) return styles.negative;
  return styles.neutral;
}

function points(series: readonly number[], width: number, height: number, inset = 3) {
  if (series.length === 0) return "";
  const minimum = Math.min(...series);
  const maximum = Math.max(...series);
  const spread = maximum - minimum || 1;
  return series.map((value, index) => {
    const x = inset + (index / Math.max(1, series.length - 1)) * (width - inset * 2);
    const y = inset + (1 - (value - minimum) / spread) * (height - inset * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function PanelTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <header className={styles.panelTitle}>
      <h2>{title}</h2>
      <span>{detail}</span>
    </header>
  );
}

function ProcessRibbon({ snapshot }: { snapshot: CValSnapshot }) {
  const humanControl = snapshot.humanControl ?? {
    contributors: 0,
  };
  const stages = [
    {
      id: "conditions",
      number: "01",
      label: "MARKET CONDITIONS",
      primary:
        snapshot.phase === "waiting"
          ? "NO HUMAN INPUT"
          : `V ${Math.round(snapshot.parameters.volatility * 100)}  A ${Math.round(snapshot.parameters.activity * 100)}  L ${Math.round(snapshot.parameters.liquidity * 100)}`,
      secondary:
        snapshot.phase === "waiting" ? "market held at 100" : "direct phone input · 0–100",
    },
    {
      id: "orders",
      number: "02",
      label: "AGENT DECISIONS",
      primary:
        snapshot.phase === "waiting"
          ? "0 participants"
          : `${snapshot.market.submittedOrders} orders · ${snapshot.market.executions} trades`,
      secondary:
        snapshot.phase === "waiting"
          ? "opens on first phone movement"
          : `${humanControl.contributors} human · participant response`,
    },
    {
      id: "book",
      number: "03",
      label: "PRICE FORMATION",
      primary: `${snapshot.market.depth.toLocaleString()} shares  ·  ${snapshot.market.spreadBps.toFixed(1)} bps`,
      secondary: "resting supply + matching",
    },
    {
      id: "market",
      number: "04",
      label: "REALIZED MARKET",
      primary: `${snapshot.market.executions} trades  ·  ${snapshot.market.index.toFixed(2)} last`,
      secondary: "execution-derived outcome",
    },
  ];

  return (
    <section className={styles.processRibbon} aria-label="C-VAL market process">
      {stages.map((stage, index) => (
        <div key={stage.id}>
          <b>{stage.number}</b>
          <span><strong>{stage.label}</strong><small>{stage.secondary}</small></span>
          <output>{stage.primary}</output>
          {index < stages.length - 1 ? <i aria-hidden="true">›</i> : null}
        </div>
      ))}
    </section>
  );
}

function ConditionRow({
  code,
  name,
  explanation,
  value,
  series,
  toneName,
}: {
  code: string;
  name: string;
  explanation: string;
  value: number;
  series: readonly number[];
  toneName: "volatility" | "activity" | "liquidity";
}) {
  const percentage = Math.round(value * 100);
  return (
    <div className={styles.conditionRow} data-tone={toneName}>
      <header><b>{code}</b><span>{name}</span><output>{percentage}</output></header>
      <svg viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true"><polyline points={points(series, 120, 28)} /></svg>
      <small>{explanation}</small>
      <i aria-hidden="true"><em style={{ "--level": `${percentage}%` } as VisualProperties} /></i>
    </div>
  );
}

function MarketConditions({ snapshot }: { snapshot: CValSnapshot }) {
  const openingPrice = snapshot.market.openingPrice ?? 100;
  const changeFromOpen = snapshot.market.changeFromOpenPercent ?? ((snapshot.market.index / openingPrice - 1) * 100);
  const dayMove = snapshot.market.oneSecondMovePercent ?? snapshot.market.returnPercent;
  const fundamental = snapshot.market.fundamental ?? snapshot.market.index;

  return (
    <section className={`${styles.panel} ${styles.conditionsPanel}`} aria-label="Market price and V A L conditions">
      <PanelTitle title="MARKET CONDITIONS" detail="EXOGENOUS PHONE INPUT → AGENT BEHAVIOR" />
      <div className={styles.quoteBand}>
        <div className={styles.lastPrice}>
          <span>LAST EXECUTED PRICE</span>
          <strong className={tone(dayMove)}>{snapshot.market.index.toFixed(2)}</strong>
          <small><b className={tone(dayMove)}>{signed(dayMove, 1)}%</b> MARKET DAY &nbsp; <b className={tone(changeFromOpen)}>{signed(changeFromOpen, 1)}%</b> FROM OPEN</small>
        </div>
        <dl className={styles.quoteFacts}>
          <div><dt>OPEN</dt><dd>{openingPrice.toFixed(2)}</dd></div>
          <div><dt>VALUE</dt><dd>{fundamental.toFixed(2)}</dd></div>
          <div><dt>DAY HIGH</dt><dd>{snapshot.market.oneSecondHigh.toFixed(2)}</dd></div>
          <div><dt>DAY LOW</dt><dd>{snapshot.market.oneSecondLow.toFixed(2)}</dd></div>
          <div><dt>BEST BID</dt><dd className={styles.positive}>{snapshot.market.bestBid.toFixed(2)}</dd></div>
          <div><dt>BEST ASK</dt><dd className={styles.negative}>{snapshot.market.bestAsk.toFixed(2)}</dd></div>
        </dl>
      </div>
      <div className={styles.conditionList} aria-label="Volatility activity and liquidity values">
        <ConditionRow code="V" name="VOLATILITY" explanation="valuation dispersion · quote defence" value={snapshot.parameters.volatility} series={snapshot.history.volatility} toneName="volatility" />
        <ConditionRow code="A" name="ACTIVITY" explanation="sell ← directional activity → buy" value={snapshot.parameters.activity} series={snapshot.history.activity} toneName="activity" />
        <ConditionRow code="L" name="LIQUIDITY" explanation="resting supply · replenishment" value={snapshot.parameters.liquidity} series={snapshot.history.liquidity} toneName="liquidity" />
      </div>
    </section>
  );
}

function MiniTrack({ label, value, unit, series, toneName }: { label: string; value: string; unit: string; series: readonly number[]; toneName: string }) {
  return (
    <div className={styles.miniTrack} data-tone={toneName}>
      <span>{label}</span>
      <svg viewBox="0 0 150 26" preserveAspectRatio="none" aria-hidden="true"><polyline points={points(series, 150, 26)} /></svg>
      <strong>{value}</strong>
      <small>{unit}</small>
    </div>
  );
}

function PriceDiscovery({ snapshot }: { snapshot: CValSnapshot }) {
  const series = [...snapshot.history.index, snapshot.market.index];
  const openingPrice = snapshot.market.openingPrice ?? 100;
  const minimum = Math.min(...series);
  const maximum = Math.max(...series);
  const spread = maximum - minimum || 1;
  const openingY = 8 + (1 - (openingPrice - minimum) / spread) * 130;
  const lastY = 8 + (1 - (snapshot.market.index - minimum) / spread) * 130;

  return (
    <section className={`${styles.panel} ${styles.pricePanel}`} aria-label="Executed price discovery and aligned condition history">
      <PanelTitle title="PRICE DISCOVERY" detail={`120 OBSERVATIONS · HIGH ${maximum.toFixed(2)} · LOW ${minimum.toFixed(2)}`} />
      <div className={styles.priceChart}>
        <svg viewBox="0 0 720 154" preserveAspectRatio="none" role="img" aria-label="Executed price history">
          {[28, 62, 96, 130].map((y) => <line className={styles.chartGrid} key={y} x1="0" x2="720" y1={y} y2={y} />)}
          <line className={styles.openingLine} x1="0" x2="720" y1={openingY} y2={openingY} />
          <polyline className={styles.priceLine} points={points(series, 720, 146, 7)} />
          <line className={styles.lastLine} x1="676" x2="720" y1={lastY} y2={lastY} />
          <text x="7" y={Math.max(10, openingY - 4)}>OPEN {openingPrice.toFixed(2)}</text>
          <text className={styles.lastLabel} x="714" y={Math.max(10, lastY - 4)} textAnchor="end">LAST {snapshot.market.index.toFixed(2)}</text>
        </svg>
      </div>
      <div className={styles.trackGrid} aria-label="Aligned condition and market outcome histories">
        <MiniTrack label="V" value={(snapshot.parameters.volatility * 100).toFixed(0)} unit="CONDITION" series={snapshot.history.volatility} toneName="volatility" />
        <MiniTrack label="A" value={(snapshot.parameters.activity * 100).toFixed(0)} unit="CONDITION" series={snapshot.history.activity} toneName="activity" />
        <MiniTrack label="L" value={(snapshot.parameters.liquidity * 100).toFixed(0)} unit="CONDITION" series={snapshot.history.liquidity} toneName="liquidity" />
        <MiniTrack label="DEPTH" value={snapshot.market.depth.toLocaleString()} unit="SHARES / 5L" series={snapshot.history.depth} toneName="depth" />
        <MiniTrack label="R VOL" value={snapshot.market.realizedVolatilityBps.toFixed(1)} unit="BPS" series={snapshot.history.realizedVolatilityBps} toneName="realized" />
      </div>
    </section>
  );
}

function MarketOutcomes({ snapshot }: { snapshot: CValSnapshot }) {
  const midpoint = (snapshot.market.bestBid + snapshot.market.bestAsk) / 2;
  const valueGap = (snapshot.market.index / (snapshot.market.fundamental || snapshot.market.index) - 1) * 100;
  const metrics = [
    ["REALIZED VOL", snapshot.market.realizedVolatilityBps.toFixed(1), "BPS"],
    ["TURNOVER", snapshot.market.turnover.toLocaleString(), "SH / 10D"],
    ["RESTING DEPTH", snapshot.market.depth.toLocaleString(), "SH / 5L"],
    ["TOP SPREAD", snapshot.market.spreadBps.toFixed(1), "BPS"],
    ["PRICE IMPACT", snapshot.market.priceImpactBps.toFixed(2), "BPS / 100"],
    ["ORDER IMBALANCE", signed(snapshot.market.orderImbalance * 100, 1), "%"],
    ["MIDPOINT", midpoint.toFixed(2), "BID / ASK"],
    ["PRICE / VALUE", signed(valueGap, 1), "% GAP"],
    ["EXECUTIONS", snapshot.market.executions.toLocaleString(), "RUN TOTAL"],
  ] as const;
  const maximumResting = Math.max(1, ...snapshot.participants.map((participant) => participant.restingOrders));

  return (
    <section className={`${styles.panel} ${styles.outcomesPanel}`} aria-label="Realized market outcomes and participant population">
      <PanelTitle title="REALIZED MARKET" detail="ONLY EXECUTION-DERIVED OUTCOMES" />
      <div className={styles.outcomeMetrics}>
        {metrics.map(([label, value, unit]) => (
          <div key={label}><span>{label}</span><strong className={label === "ORDER IMBALANCE" || label === "PRICE / VALUE" ? tone(Number(value)) : undefined}>{value}</strong><small>{unit}</small></div>
        ))}
      </div>
      <div className={styles.participantSummary}>
        <header><span>PARTICIPANT TYPE</span><span>AGENTS</span><span>RESTING</span><span>BOOK SHARE</span></header>
        {snapshot.participants.map((participant) => (
          <div key={participant.type}>
            <strong>{participantLabel(participant.type)}</strong>
            <span>{participant.count}</span>
            <span>{participant.restingOrders}</span>
            <i><b style={{ "--share": `${(participant.restingOrders / maximumResting) * 100}%` } as VisualProperties} /></i>
          </div>
        ))}
      </div>
    </section>
  );
}

function orderPrice(order: CValOrder) {
  return order.kind === "market" || order.price === null ? "MKT" : order.price.toFixed(2);
}

function ParticipantFlow({ snapshot }: { snapshot: CValSnapshot }) {
  return (
    <div className={styles.participantFlow}>
      <header><span>PARTICIPANT</span><span>BUY</span><span>SELL</span><span>MKT</span><span>LMT</span><span>FILL %</span><span>QTY</span></header>
      {snapshot.participants.map(({ type }) => {
        const group = snapshot.recentOrders.filter((order) => order.participantType === type);
        const quantity = group.reduce((sum, order) => sum + order.quantity, 0);
        const filled = group.reduce((sum, order) => sum + order.filled, 0);
        const values = [
          group.filter((order) => order.side === "buy").length,
          group.filter((order) => order.side === "sell").length,
          group.filter((order) => order.kind === "market").length,
          group.filter((order) => order.kind === "limit").length,
          quantity > 0 ? Math.round((filled / quantity) * 100) : 0,
          quantity,
        ];
        return (
          <div key={type}>
            <strong>{participantLabel(type)}</strong>
            {values.map((value, index) => <span data-active={value > 0} key={`${type}-flow-${index}`}>{value}</span>)}
          </div>
        );
      })}
    </div>
  );
}

function OrdersPanel({ snapshot }: { snapshot: CValSnapshot }) {
  const orders = [...snapshot.recentOrders].reverse();
  return (
    <section className={`${styles.panel} ${styles.ordersPanel}`} aria-label="All recent agent orders and participant behavior">
      <PanelTitle title="AGENT ORDER FLOW" detail={`${orders.length} RECENT · ${snapshot.market.submittedOrders} SUBMITTED · ${snapshot.market.cancelledOrders} CANCELLED`} />
      <div className={styles.orderColumns}><span>SIDE</span><span>PARTICIPANT</span><span>TYPE</span><span>STATUS</span><span>PRICE</span><span>FILLED</span></div>
      <ol className={styles.orderRows}>
        {orders.map((order) => (
          <li data-kind={order.kind} data-side={order.side} key={order.id}>
            <b>{order.side === "buy" ? "BUY" : "SELL"}</b>
            <span>{participantLabel(order.participantType)}</span>
            <span>{order.kind.toUpperCase()}</span>
            <span>{order.status.replace("partially-filled", "PART FILL").toUpperCase()}</span>
            <strong>{orderPrice(order)}</strong>
            <em>{order.filled}/{order.quantity}</em>
          </li>
        ))}
      </ol>
      <ParticipantFlow snapshot={snapshot} />
    </section>
  );
}

function BookSide({ levels, side, maximum }: { levels: CValBookLevel[]; side: "buy" | "sell"; maximum: number }) {
  return levels.map((level) => (
    <div className={styles.bookRow} data-side={side} key={`${side}-${level.price}`}>
      <i style={{ "--depth": `${(level.quantity / maximum) * 100}%` } as VisualProperties} />
      <span>{level.orderCount}</span>
      <strong>{level.price.toFixed(2)}</strong>
      <b>{level.quantity.toLocaleString()}</b>
    </div>
  ));
}

function OrderBookPanel({ snapshot }: { snapshot: CValSnapshot }) {
  const asks = [...snapshot.orderBook.asks].reverse();
  const bids = snapshot.orderBook.bids;
  const maximum = Math.max(1, ...asks.map((level) => level.quantity), ...bids.map((level) => level.quantity));
  const totalOrders = [...asks, ...bids].reduce((sum, level) => sum + level.orderCount, 0);

  return (
    <section className={`${styles.panel} ${styles.bookPanel}`} aria-label="Full resting limit order book">
      <PanelTitle title="MARKET BY PRICE" detail={`${totalOrders} RESTING ORDERS · PRICE / FIFO PRIORITY`} />
      <div className={styles.bookColumns}><span>ORDERS</span><span>PRICE</span><span>QUANTITY</span></div>
      <div className={styles.bookRows}>
        <BookSide levels={asks} side="sell" maximum={maximum} />
        <div className={styles.insideMarket}>
          <span>BID <b>{snapshot.market.bestBid.toFixed(2)}</b></span>
          <strong>{snapshot.market.spreadBps.toFixed(1)} BPS SPREAD</strong>
          <span>ASK <b>{snapshot.market.bestAsk.toFixed(2)}</b></span>
        </div>
        <BookSide levels={bids} side="buy" maximum={maximum} />
      </div>
    </section>
  );
}

function executionSummary(trades: CValTrade[], fallbackPrice: number) {
  const volume = trades.reduce((sum, trade) => sum + trade.quantity, 0);
  const buyVolume = trades.reduce((sum, trade) => sum + (trade.side === "buy" ? trade.quantity : 0), 0);
  const prices = trades.map((trade) => trade.price);
  return {
    volume,
    buyVolume,
    sellVolume: volume - buyVolume,
    vwap: volume > 0 ? trades.reduce((sum, trade) => sum + trade.price * trade.quantity, 0) / volume : fallbackPrice,
    high: prices.length ? Math.max(...prices) : fallbackPrice,
    low: prices.length ? Math.min(...prices) : fallbackPrice,
    largest: trades.length ? Math.max(...trades.map((trade) => trade.quantity)) : 0,
  };
}

function ExecutionsPanel({ snapshot }: { snapshot: CValSnapshot }) {
  const trades = [...snapshot.recentTrades].reverse();
  const summary = useMemo(() => executionSummary(snapshot.recentTrades, snapshot.market.index), [snapshot.market.index, snapshot.recentTrades]);
  const buyShare = summary.volume > 0 ? (summary.buyVolume / summary.volume) * 100 : 50;
  return (
    <section className={`${styles.panel} ${styles.executionsPanel}`} aria-label="Recent market executions and execution quality">
      <PanelTitle title="TIME & SALES" detail={`${trades.length} RECENT EXECUTIONS · ACTUAL MATCHES`} />
      <div className={styles.tradeColumns}><span>ACTION</span><span>PRICE</span><span>SIZE</span><span>COUNTERPARTY</span></div>
      <ol className={styles.tradeRows}>
        {trades.map((trade) => (
          <li data-side={trade.side} key={trade.id}>
            <b>{trade.side === "buy" ? "BOT" : "SLD"}</b>
            <strong>{trade.price.toFixed(2)}</strong>
            <em>{trade.quantity}</em>
            <span>{trade.side === "buy" ? trade.sellerId : trade.buyerId}</span>
          </li>
        ))}
      </ol>
      <div className={styles.executionSummary}>
        <div><span>VWAP</span><strong>{summary.vwap.toFixed(2)}</strong></div>
        <div><span>HIGH / LOW</span><strong>{summary.high.toFixed(2)} / {summary.low.toFixed(2)}</strong></div>
        <div><span>VOLUME</span><strong>{summary.volume.toLocaleString()}</strong></div>
        <div><span>LARGEST</span><strong>{summary.largest}</strong></div>
        <div><span>BUY VOLUME</span><strong className={styles.positive}>{summary.buyVolume.toLocaleString()}</strong></div>
        <div><span>SELL VOLUME</span><strong className={styles.negative}>{summary.sellVolume.toLocaleString()}</strong></div>
      </div>
      <div className={styles.executionBalance} style={{ "--buy-share": `${buyShare}%` } as VisualProperties} aria-label={`Buy volume ${buyShare.toFixed(0)} percent and sell volume ${(100 - buyShare).toFixed(0)} percent`}>
        <i />
        <span>BUY {buyShare.toFixed(0)}%</span><span>SELL {(100 - buyShare).toFixed(0)}%</span>
      </div>
    </section>
  );
}

export default function CValController() {
  const [fallback] = useState(() => createInitialCValSnapshot());
  const [recordCommand, setRecordCommand] = useState("RECORD 30");
  const [recordCommandResult, setRecordCommandResult] = useState("READY");
  const recordAckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { connected, state, sendRecordingCommand, resetSystem } =
    useCValSocket({
      role: "controller",
      onRecordingStatus: ({ status, message }) => {
        if (recordAckTimerRef.current) {
          clearTimeout(recordAckTimerRef.current);
          recordAckTimerRef.current = null;
        }
        setRecordCommandResult(`${status.toUpperCase()} · ${message.toUpperCase()}`);
      },
    });
  const snapshot = state ?? fallback;

  useEffect(() => {
    return () => {
      if (recordAckTimerRef.current) clearTimeout(recordAckTimerRef.current);
    };
  }, []);

  async function submitRecordCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (recordAckTimerRef.current) {
      clearTimeout(recordAckTimerRef.current);
      recordAckTimerRef.current = null;
    }
    const normalized = recordCommand.trim().toUpperCase();
    const recordMatch = normalized.match(/^RECORD\s+(30|60)$/);
    if (!recordMatch && normalized !== "STOP") {
      setRecordCommandResult("USE RECORD 30 · RECORD 60 · STOP");
      return;
    }
    const command = recordMatch
      ? {
          action: "start" as const,
          durationMs: Number(recordMatch[1]) * 1_000,
        }
      : { action: "stop" as const };
    const result = await sendRecordingCommand(command);
    if (!result.ok) {
      setRecordCommandResult(result.error?.toUpperCase() ?? "COMMAND FAILED");
      return;
    }
    setRecordCommandResult(
      `${normalized} SENT · WAITING FOR ${result.mobileCount ?? 0} MOBILE`,
    );
    if (command.action === "start") {
      recordAckTimerRef.current = setTimeout(() => {
        recordAckTimerRef.current = null;
        setRecordCommandResult("NO MOBILE RECORDING ACK · CHECK ENABLE MOTION");
      }, 1_500);
    }
  }

  return (
    <CValBloombergWorkstationFrame className={styles.terminal}>
      <header className={styles.chrome}>
        <div className={styles.identity}><strong>C·VAL / 2</strong><span>CONTINUOUS DOUBLE-AUCTION MARKET</span></div>
        <div className={styles.session}><b>CVAL SIMULATED EQUITY</b><span>1 REAL SECOND = 1 MARKET DAY</span></div>
        <form className={styles.command} onSubmit={submitRecordCommand}>
          <label htmlFor="c-val-record-command">REC</label>
          <input
            id="c-val-record-command"
            aria-label="Sensor recording command"
            autoCapitalize="characters"
            autoComplete="off"
            disabled={!connected}
            spellCheck={false}
            value={recordCommand}
            onChange={(event) => setRecordCommand(event.target.value)}
          />
          <button type="submit" disabled={!connected}>GO</button>
          <output>{recordCommandResult}</output>
        </form>
        <div className={styles.status} data-connected={connected}><i />{connected ? "SERVER CONNECTED" : "CONNECTING"}</div>
        <button type="button" disabled={!connected} onClick={resetSystem}>RESET MARKET</button>
      </header>
      <ProcessRibbon snapshot={snapshot} />
      <div className={styles.workspace}>
        <MarketConditions snapshot={snapshot} />
        <PriceDiscovery snapshot={snapshot} />
        <MarketOutcomes snapshot={snapshot} />
        <OrdersPanel snapshot={snapshot} />
        <OrderBookPanel snapshot={snapshot} />
        <ExecutionsPanel snapshot={snapshot} />
      </div>
    </CValBloombergWorkstationFrame>
  );
}
