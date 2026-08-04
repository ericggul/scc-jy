"use client";

import styled from "styled-components";
import {
  cValParameterIds,
  cValParameterLabels,
  type CValSnapshot,
} from "@/components/c-val/2/model";
import { cValIndexPath } from "./presenter";

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
  padding: clamp(18px, 4cqmin, 56px);
  box-sizing: border-box;
  background: #f2f1ed;
  color: #11110f;
  font-family: Arial, Helvetica, sans-serif;
  font-variant-numeric: tabular-nums;
`;

const Market = styled.section`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
`;

const Reading = styled.div`
  align-self: center;

  p {
    margin: 0 0 1.5cqh;
    font-size: clamp(10px, 1.2cqw, 18px);
    letter-spacing: 0.04em;
  }

  strong {
    display: block;
    font-size: clamp(72px, 20cqw, 300px);
    font-weight: 300;
    letter-spacing: -0.075em;
    line-height: 0.8;
  }

  output {
    display: block;
    margin-top: 2.5cqh;
    color: #343431;
    font: 500 clamp(13px, 1.5cqw, 22px) / 1
      "SFMono-Regular", Consolas, monospace;
  }

  output[data-direction="up"] {
    color: #3f6652;
  }

  output[data-direction="down"] {
    color: #8a5838;
  }
`;

const Trace = styled.svg`
  align-self: end;
  width: 100%;
  height: min(18cqh, 150px);
  overflow: visible;

  path {
    fill: none;
    stroke: #11110f;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.25;
    vector-effect: non-scaling-stroke;
  }
`;

const Parameters = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  padding-top: clamp(14px, 2.5cqh, 30px);
  border-top: 1px solid currentColor;

  div {
    min-width: 0;
  }

  dt {
    overflow: hidden;
    font-size: clamp(9px, 1cqw, 15px);
    letter-spacing: 0.03em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  dd {
    margin: 1cqh 0 0;
    font: 500 clamp(24px, 5cqw, 74px) / 1
      "SFMono-Regular", Consolas, monospace;
  }
`;

export default function CValMarketScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const change = Number.isFinite(snapshot.market.changeFromOpenPercent)
    ? snapshot.market.changeFromOpenPercent
    : 0;
  const direction = change > 0.005 ? "up" : change < -0.005 ? "down" : "steady";

  return (
    <Wrapper>
      <Market aria-label="C-VAL executed market price">
        <Reading>
          <p>MARKET INDEX</p>
          <strong>{snapshot.market.index.toFixed(2)}</strong>
          <output data-direction={direction}>
            {change >= 0 ? "+" : ""}{change.toFixed(2)}%
          </output>
        </Reading>
        <Trace aria-label="Market index history" preserveAspectRatio="none" viewBox="0 0 100 40">
          <path d={cValIndexPath(snapshot)} />
        </Trace>
      </Market>
      <Parameters>
        {cValParameterIds.map((parameterId) => (
          <div key={parameterId}>
            <dt>{cValParameterLabels[parameterId]}</dt>
            <dd>{(snapshot.parameters[parameterId] * 100).toFixed(0)}</dd>
          </div>
        ))}
      </Parameters>
    </Wrapper>
  );
}
