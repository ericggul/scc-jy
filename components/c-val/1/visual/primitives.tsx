"use client";

import styled, { css } from "styled-components";
import {
  cValBloombergPalette,
  cValBloombergTypography,
  cValBloombergWorkstationChassis,
} from "./tokens";

/**
 * Opt-in visual grammar for a genuine C-VAL observation workstation.
 * It supplies semantic variables and text behavior only; the caller owns the
 * data model, density, panel geometry, and responsive record contract.
 */
export const cValBloombergWorkstationTokens = css`
  --cval-bloomberg-ground: ${cValBloombergPalette.ground};
  --cval-bloomberg-surface: ${cValBloombergPalette.surface};
  --cval-bloomberg-surface-raised: ${cValBloombergPalette.surfaceRaised};
  --cval-bloomberg-header: ${cValBloombergPalette.header};
  --cval-bloomberg-rule: ${cValBloombergPalette.rule};
  --cval-bloomberg-rule-strong: ${cValBloombergPalette.ruleStrong};
  --cval-bloomberg-text: ${cValBloombergPalette.text};
  --cval-bloomberg-muted: ${cValBloombergPalette.muted};
  --cval-bloomberg-dim: ${cValBloombergPalette.dim};
  --cval-bloomberg-amber: ${cValBloombergPalette.amber};
  --cval-bloomberg-positive: ${cValBloombergPalette.positive};
  --cval-bloomberg-negative: ${cValBloombergPalette.negative};
  --cval-bloomberg-liquidity: ${cValBloombergPalette.liquidity};
  --cval-bloomberg-mono: ${cValBloombergTypography.record};
  --cval-bloomberg-sans: ${cValBloombergTypography.heading};
  --cval-bloomberg-workstation-scale: ${cValBloombergTypography.workstationScale};
  --cval-bloomberg-chrome: ${cValBloombergWorkstationChassis.chrome};
  --cval-bloomberg-chrome-dark: ${cValBloombergWorkstationChassis.chromeDark};
  --cval-bloomberg-chrome-text: ${cValBloombergWorkstationChassis.chromeText};
  --cval-bloomberg-command: ${cValBloombergWorkstationChassis.command};
  --cval-bloomberg-control: ${cValBloombergWorkstationChassis.control};
  --cval-bloomberg-process: ${cValBloombergWorkstationChassis.process};
  --cval-bloomberg-table-header: ${cValBloombergWorkstationChassis.tableHeader};
  --cval-bloomberg-inside-market: ${cValBloombergWorkstationChassis.insideMarket};
  --cval-bloomberg-balance: ${cValBloombergWorkstationChassis.balance};
  --cval-bloomberg-data-rule: ${cValBloombergWorkstationChassis.dataRule};
  --cval-bloomberg-row-rule: ${cValBloombergWorkstationChassis.rowRule};
  --cval-bloomberg-summary-rule: ${cValBloombergWorkstationChassis.summaryRule};
  --cval-bloomberg-vertical-rule: ${cValBloombergWorkstationChassis.verticalRule};
  --cval-bloomberg-soft-rule: ${cValBloombergWorkstationChassis.softRule};
  --cval-bloomberg-track: ${cValBloombergWorkstationChassis.track};
  --cval-bloomberg-bar-track: ${cValBloombergWorkstationChassis.barTrack};
  --cval-bloomberg-chart-reference: ${cValBloombergWorkstationChassis.chartReference};
  --cval-bloomberg-chart-muted: ${cValBloombergWorkstationChassis.chartMuted};
  --cval-bloomberg-chart-primary: ${cValBloombergWorkstationChassis.chartPrimary};
  --cval-bloomberg-chart-secondary: ${cValBloombergWorkstationChassis.chartSecondary};
  --cval-bloomberg-text-bright: ${cValBloombergWorkstationChassis.textBright};
  --cval-bloomberg-text-strong: ${cValBloombergWorkstationChassis.textStrong};
  --cval-bloomberg-text-medium: ${cValBloombergWorkstationChassis.textMedium};
  --cval-bloomberg-record-text: ${cValBloombergWorkstationChassis.recordText};
  --cval-bloomberg-trade-text: ${cValBloombergWorkstationChassis.tradeText};
  --cval-bloomberg-book-text: ${cValBloombergWorkstationChassis.bookText};
  --cval-bloomberg-on-amber: ${cValBloombergWorkstationChassis.onAmber};
  --cval-bloomberg-amber-ink: ${cValBloombergWorkstationChassis.amberInk};
  --cval-bloomberg-white: ${cValBloombergWorkstationChassis.white};
  --cval-bloomberg-disabled: ${cValBloombergWorkstationChassis.disabled};
  --cval-bloomberg-connected: ${cValBloombergWorkstationChassis.connected};
  --cval-bloomberg-market-row: ${cValBloombergWorkstationChassis.marketRow};
  --cval-bloomberg-positive-wash: ${cValBloombergWorkstationChassis.positiveWash};
  --cval-bloomberg-positive-wash-rule: ${cValBloombergWorkstationChassis.positiveWashRule};
  --cval-bloomberg-positive-wash-text: ${cValBloombergWorkstationChassis.positiveWashText};
  --cval-bloomberg-positive-depth: ${cValBloombergWorkstationChassis.positiveDepth};
  --cval-bloomberg-negative-depth: ${cValBloombergWorkstationChassis.negativeDepth};
  color: var(--cval-bloomberg-text);
  font-family: var(--cval-bloomberg-mono);
  font-variant-numeric: tabular-nums;
`;

/** Use only around an observer-facing screen with real simultaneous evidence. */
export const CValBloombergWorkstationFrame = styled.main`
  ${cValBloombergWorkstationTokens}
`;

/** Compose on a section that contains a distinct observational data set. */
export const cValBloombergPanel = css`
  background: var(--cval-bloomberg-surface);
  box-shadow: inset 0 0 0 1px var(--cval-bloomberg-rule);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

/** Compose on the short header for a real panel, never as decorative chrome. */
export const cValBloombergPanelHeader = css`
  align-items: center;
  background: var(--cval-bloomberg-header);
  box-shadow: inset 0 -1px var(--cval-bloomberg-rule-strong);
  color: var(--cval-bloomberg-amber);
  display: flex;
  font-family: var(--cval-bloomberg-sans);
  font-size: 0.917em;
  font-weight: 850;
  letter-spacing: 0.02em;
  min-width: 0;
  padding: 0 0.65em;
`;

/** Compose on a comparable data row. Names remain left; values align right. */
export const cValBloombergRecordRow = css`
  align-items: center;
  box-shadow: inset 0 -1px var(--cval-bloomberg-row-rule);
  min-width: 0;
  font-size: 0.917em;
  line-height: 1;

  [data-cval-value] {
    text-align: right;
  }
`;
