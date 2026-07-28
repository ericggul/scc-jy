"use client";

import { useState, type CSSProperties } from "react";
import styled from "styled-components";
import {
  createInitialCValSnapshot,
  type CValBookLevel,
  type CValOrder,
  type CValSnapshot,
  type CValTrade,
} from "@/components/network-system/c-val/model";
import { useCValSocket } from "@/components/network-system/c-val/transport";

const ink = "#151512";
const paper = "#f1f0eb";
const muted = "#6a6962";
const bid = "#3f6652";
const bidWash = "#dce6df";
const ask = "#8a5838";
const askWash = "#eadfd7";

const Page = styled.main`
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  min-width: 620px;
  overflow: auto;
  background: ${paper};
  color: ${ink};
  font-family: Arial, Helvetica, sans-serif;
  font-variant-numeric: tabular-nums;
  overscroll-behavior: contain;
`;

const Header = styled.header`
  display: grid;
  grid-template-columns: minmax(190px, 1.15fr) repeat(4, minmax(95px, 0.7fr)) auto;
  gap: clamp(14px, 2.2vw, 34px);
  align-items: end;
  padding: clamp(14px, 2.2vh, 24px) clamp(16px, 2.5vw, 34px);

  @media (max-width: 880px) {
    grid-template-columns: minmax(150px, 1.2fr) repeat(2, minmax(80px, 0.7fr)) auto;

    > div:nth-of-type(4),
    > div:nth-of-type(5) {
      display: none;
    }
  }
`;

const Price = styled.div`
  strong {
    display: block;
    font-size: clamp(34px, 5vw, 72px);
    font-weight: 300;
    letter-spacing: -0.065em;
    line-height: 0.82;
  }

  span {
    display: block;
    margin-top: 8px;
    color: ${muted};
    font-size: clamp(9px, 0.8vw, 11px);
    letter-spacing: 0.03em;
  }
`;

const Measure = styled.div`
  min-width: 0;

  span {
    display: block;
    overflow: hidden;
    color: ${muted};
    font-size: clamp(8px, 0.72vw, 10px);
    letter-spacing: 0.035em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  output {
    display: block;
    margin-top: 6px;
    font: 500 clamp(14px, 1.55vw, 23px) / 1
      "SFMono-Regular", Consolas, monospace;
  }
`;

const Reset = styled.button`
  height: 34px;
  padding: 0 12px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font: 500 10px/1 "SFMono-Regular", Consolas, monospace;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: ${ink};
    color: ${paper};
    outline: none;
  }

  &:disabled {
    cursor: default;
    opacity: 0.32;
  }
`;

const ValBand = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(8px, 1.4vw, 20px);
  padding: 0 clamp(16px, 2.5vw, 34px) clamp(14px, 2vh, 22px);
`;

const Val = styled.div<{ $tone: string }>`
  position: relative;
  height: clamp(42px, 6vh, 62px);
  overflow: hidden;
  padding: 9px 11px;
  box-sizing: border-box;
  background: #e5e3dc;

  &::before {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--val-width);
    background: ${({ $tone }) => $tone};
    content: "";
  }

  div {
    position: relative;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: baseline;
  }

  span {
    font-size: clamp(9px, 0.8vw, 11px);
    letter-spacing: 0.035em;
  }

  output {
    font: 500 clamp(17px, 1.8vw, 26px) / 1
      "SFMono-Regular", Consolas, monospace;
  }
`;

const MarketBody = styled.div`
  display: grid;
  grid-template-columns: minmax(210px, 0.85fr) minmax(330px, 1.25fr) minmax(220px, 0.9fr);
  min-height: 0;
  padding: 0 clamp(16px, 2.5vw, 34px) clamp(16px, 2.5vh, 28px);
  gap: clamp(12px, 1.8vw, 28px);

  @media (max-width: 760px) {
    grid-template-columns: minmax(260px, 1.25fr) minmax(190px, 0.75fr);

    > section:first-child {
      display: none;
    }
  }
`;

const Column = styled.section`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;

  h2 {
    margin: 0 0 10px;
    color: ${muted};
    font-size: clamp(9px, 0.76vw, 11px);
    font-weight: 500;
    letter-spacing: 0.04em;
  }
`;

const FlowList = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  list-style: none;
`;

const OrderRow = styled.li<{ $side: "buy" | "sell" }>`
  display: grid;
  grid-template-columns: 43px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 34px;
  padding: 6px 8px;
  box-sizing: border-box;
  background: ${({ $side }) => ($side === "buy" ? bidWash : askWash)};
  font: 500 clamp(9px, 0.72vw, 11px) / 1.1
    "SFMono-Regular", Consolas, monospace;

  strong {
    color: ${({ $side }) => ($side === "buy" ? bid : ask)};
    font-weight: 700;
  }

  div {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: block;
    margin-top: 3px;
    color: ${muted};
    font: 500 8px/1 Arial, Helvetica, sans-serif;
  }
`;

const BookColumn = styled(Column)`
  grid-template-rows: auto minmax(0, 1fr);
`;

const Ladder = styled.div`
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto minmax(0, 1fr);
  min-height: 0;
`;

const Levels = styled.div<{ $align: "top" | "bottom" }>`
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: flex-start;
  gap: 2px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;

  > div:first-child {
    margin-top: ${({ $align }) => ($align === "bottom" ? "auto" : "0")};
  }
`;

const Level = styled.div<{
  $side: "buy" | "sell";
}>`
  position: relative;
  display: grid;
  grid-template-columns: 1fr 86px 1fr;
  gap: 10px;
  align-items: center;
  min-height: clamp(22px, 3.2vh, 34px);
  padding: 0 8px;
  overflow: hidden;
  box-sizing: border-box;
  font: 500 clamp(10px, 0.88vw, 13px) / 1
    "SFMono-Regular", Consolas, monospace;

  &::before {
    position: absolute;
    inset: 0;
    width: var(--level-width);
    margin-left: ${({ $side }) => ($side === "buy" ? "auto" : "0")};
    background: ${({ $side }) => ($side === "buy" ? bidWash : askWash)};
    content: "";
  }

  span,
  strong {
    position: relative;
  }

  span:first-child {
    color: ${muted};
    text-align: ${({ $side }) => ($side === "buy" ? "right" : "left")};
  }

  strong {
    color: ${({ $side }) => ($side === "buy" ? bid : ask)};
    font-weight: 600;
    text-align: center;
  }

  span:last-child {
    color: ${muted};
    text-align: ${({ $side }) => ($side === "buy" ? "left" : "right")};
  }
`;

const Spread = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  min-height: 48px;
  padding: 4px 8px;
  color: ${muted};
  font: 500 clamp(9px, 0.78vw, 11px) / 1
    "SFMono-Regular", Consolas, monospace;

  span:first-child {
    color: ${bid};
    text-align: right;
  }

  span:last-child {
    color: ${ask};
  }
`;

const TradeRow = styled.li<{ $side: "buy" | "sell" }>`
  display: grid;
  grid-template-columns: 38px 1fr auto;
  gap: 9px;
  align-items: baseline;
  min-height: 31px;
  padding: 6px 8px;
  box-sizing: border-box;
  color: ${({ $side }) => ($side === "buy" ? bid : ask)};
  font: 500 clamp(10px, 0.8vw, 12px) / 1
    "SFMono-Regular", Consolas, monospace;

  span:last-child {
    color: ${muted};
  }
`;

function participantLabel(type: string) {
  if (type === "liquidity-provider") return "LIQUIDITY PROVIDER";
  if (type === "fundamental") return "VALUE TRADER";
  if (type === "trend") return "TREND TRADER";
  return "FLOW TRADER";
}

function orderPrice(order: CValOrder) {
  return order.kind === "market" || order.price === null
    ? "MARKET"
    : order.price.toFixed(2);
}

function OrderFeed({ orders }: { orders: CValOrder[] }) {
  return (
    <FlowList>
      {[...orders].reverse().map((order) => (
        <OrderRow key={order.id} $side={order.side}>
          <strong>{order.side === "buy" ? "BUY" : "SELL"}</strong>
          <div>
            {participantLabel(order.participantType)}
            <small>
              {orderPrice(order)} · {order.status.replace("-", " ")}
            </small>
          </div>
          <span>
            {order.filled}/{order.quantity}
          </span>
        </OrderRow>
      ))}
    </FlowList>
  );
}

function TradeFeed({ trades }: { trades: CValTrade[] }) {
  return (
    <FlowList>
      {[...trades].reverse().map((trade) => (
        <TradeRow key={trade.id} $side={trade.side}>
          <strong>{trade.side === "buy" ? "BOUGHT" : "SOLD"}</strong>
          <span>{trade.price.toFixed(2)}</span>
          <span>{trade.quantity} shares</span>
        </TradeRow>
      ))}
    </FlowList>
  );
}

function BookLevels({
  levels,
  side,
  maximum,
}: {
  levels: CValBookLevel[];
  side: "buy" | "sell";
  maximum: number;
}) {
  return (
    <>
      {levels.map((level) => (
        <Level
          key={`${side}-${level.price}`}
          $side={side}
          style={
            {
              "--level-width": `${(level.quantity / maximum) * 100}%`,
            } as CSSProperties
          }
        >
          <span>{side === "buy" ? level.quantity : `${level.orderCount} orders`}</span>
          <strong>{level.price.toFixed(2)}</strong>
          <span>{side === "buy" ? `${level.orderCount} orders` : level.quantity}</span>
        </Level>
      ))}
    </>
  );
}

function OrderBook({
  snapshot,
}: {
  snapshot: CValSnapshot;
}) {
  const asks = [...snapshot.orderBook.asks].reverse();
  const bids = snapshot.orderBook.bids;
  const maximum = Math.max(
    1,
    ...asks.map(({ quantity }) => quantity),
    ...bids.map(({ quantity }) => quantity),
  );
  return (
    <Ladder>
      <Levels $align="bottom">
        <BookLevels levels={asks} side="sell" maximum={maximum} />
      </Levels>
      <Spread>
        <span>BID {snapshot.market.bestBid.toFixed(2)}</span>
        <strong>{snapshot.market.spreadBps.toFixed(1)} bps between</strong>
        <span>ASK {snapshot.market.bestAsk.toFixed(2)}</span>
      </Spread>
      <Levels $align="top">
        <BookLevels levels={bids} side="buy" maximum={maximum} />
      </Levels>
    </Ladder>
  );
}

export default function CValController() {
  const [fallback] = useState(() => createInitialCValSnapshot());
  const { connected, state, resetSystem } = useCValSocket({
    role: "controller",
  });
  const snapshot = state ?? fallback;

  return (
    <Page>
      <Header>
        <Price>
          <strong>{snapshot.market.index.toFixed(2)}</strong>
          <span>LAST EXECUTED PRICE</span>
        </Price>
        <Measure>
          <span>REALIZED VOLATILITY</span>
          <output>{snapshot.market.realizedVolatilityBps.toFixed(1)} bps</output>
        </Measure>
        <Measure>
          <span>TRADED IN 10 SECONDS</span>
          <output>{snapshot.market.turnover.toLocaleString()} sh</output>
        </Measure>
        <Measure>
          <span>RESTING DEPTH · 5 LEVELS</span>
          <output>{snapshot.market.depth.toLocaleString()} sh</output>
        </Measure>
        <Measure>
          <span>OBSERVED IMPACT · 100 SHARES</span>
          <output>{snapshot.market.priceImpactBps.toFixed(2)} bps</output>
        </Measure>
        <Reset disabled={!connected} type="button" onClick={resetSystem}>
          RESET
        </Reset>
      </Header>

      <ValBand aria-label="Volatility, activity, and liquidity settings">
        <Val
          $tone="#ddd6a8"
          style={
            {
              "--val-width": `${snapshot.parameters.volatility * 100}%`,
            } as CSSProperties
          }
        >
          <div>
            <span>VOLATILITY · valuation dispersion</span>
            <output>{(snapshot.parameters.volatility * 100).toFixed(0)}</output>
          </div>
        </Val>
        <Val
          $tone="#cbdcc9"
          style={
            {
              "--val-width": `${snapshot.parameters.activity * 100}%`,
            } as CSSProperties
          }
        >
          <div>
            <span>ACTIVITY · order arrival</span>
            <output>{(snapshot.parameters.activity * 100).toFixed(0)}</output>
          </div>
        </Val>
        <Val
          $tone="#cddde2"
          style={
            {
              "--val-width": `${snapshot.parameters.liquidity * 100}%`,
            } as CSSProperties
          }
        >
          <div>
            <span>LIQUIDITY · resting supply</span>
            <output>{(snapshot.parameters.liquidity * 100).toFixed(0)}</output>
          </div>
        </Val>
      </ValBand>

      <MarketBody>
        <Column>
          <h2>ORDERS ENTERING THE MARKET · FILLED / SIZE</h2>
          <OrderFeed orders={snapshot.recentOrders} />
        </Column>
        <BookColumn>
          <h2>RESTING ORDERS · QUANTITY / PRICE / QUEUE</h2>
          <OrderBook snapshot={snapshot} />
        </BookColumn>
        <Column>
          <h2>ACTUAL EXECUTIONS · AGGRESSOR / PRICE / SIZE</h2>
          <TradeFeed trades={snapshot.recentTrades} />
        </Column>
      </MarketBody>
    </Page>
  );
}
