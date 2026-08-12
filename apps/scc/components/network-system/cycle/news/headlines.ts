// Fixed headline pools for all Cycle economic sectors.
import {
  cycleNodeIds,
  type CycleNodeId,
} from "@/components/network-system/cycle/model";

export const cycleNewsRegimes = [
  "surging",
  "rising",
  "steady",
  "falling",
  "plunging",
] as const;

export type CycleNewsRegime = (typeof cycleNewsRegimes)[number];
export type CycleNewsHeadlineLibrary = Record<
  CycleNodeId,
  Record<CycleNewsRegime, readonly string[]>
>;

type SectorLanguage = {
  subject: string;
  downSubject: string;
  steadySubject: string;
  upDriver: string;
  downDriver: string;
  steadyDriver: string;
  object: string;
};

const sectorLanguage: Record<CycleNodeId, SectorLanguage> = {
  "household-demand": {
    subject: "CONSUMER SPENDING",
    downSubject: "HOUSEHOLD OUTLAYS",
    steadySubject: "RETAIL DEMAND",
    upDriver: "PAY PACKETS STRETCH FURTHER",
    downDriver: "HOUSEHOLDS PRESERVE CASH",
    steadyDriver: "BUYERS REMAIN SELECTIVE",
    object: "DISCRETIONARY PURCHASES",
  },
  production: {
    subject: "FACTORY OUTPUT",
    downSubject: "INDUSTRIAL PRODUCTION",
    steadySubject: "MANUFACTURING ACTIVITY",
    upDriver: "ORDER BOOKS OUTRUN CAPACITY",
    downDriver: "BACKLOGS THIN",
    steadyDriver: "PLANTS BALANCE ORDERS AND STOCKS",
    object: "INDUSTRIAL ACTIVITY",
  },
  inventories: {
    subject: "WAREHOUSE STOCKS",
    downSubject: "INVENTORY HOLDINGS",
    steadySubject: "GOODS ON HAND",
    upDriver: "GOODS OUTPACE SALES",
    downDriver: "FIRMS DRAW DOWN STOCKS",
    steadyDriver: "SUPPLY MATCHES SALES",
    object: "STOCKPILES",
  },
  employment: {
    subject: "PAYROLLS",
    downSubject: "EMPLOYMENT",
    steadySubject: "THE LABOUR MARKET",
    upDriver: "FIRMS RACE TO FILL ROLES",
    downDriver: "EMPLOYERS TRIM COSTS",
    steadyDriver: "HIRING PLANS STAY ON PAUSE",
    object: "JOB CREATION",
  },
  "wage-share": {
    subject: "LABOUR'S SHARE OF INCOME",
    downSubject: "THE WAGE BILL",
    steadySubject: "COMPENSATION PRESSURE",
    upDriver: "PAY GAINS OUTRUN PROFITS",
    downDriver: "MARGINS TAKE PRIORITY",
    steadyDriver: "PAY AND PROFITS STAY IN BALANCE",
    object: "WORKERS' CLAIM ON OUTPUT",
  },
  investment: {
    subject: "CAPITAL SPENDING",
    downSubject: "BUSINESS INVESTMENT",
    steadySubject: "CAPEX PLANS",
    upDriver: "FIRMS BACK EXPANSION",
    downDriver: "PROJECTS ARE DEFERRED",
    steadyDriver: "FINANCE CHIEFS ASSESS THE OUTLOOK",
    object: "CORPORATE OUTLAYS",
  },
  credit: {
    subject: "BANK CREDIT",
    downSubject: "LENDING",
    steadySubject: "LOAN FLOWS",
    upDriver: "LENDERS OPEN THE TAPS",
    downDriver: "BANKS TURN MORE CAUTIOUS",
    steadyDriver: "RISK APPETITE STABILISES",
    object: "NEW FINANCE",
  },
  inflation: {
    subject: "PRICE PRESSURES",
    downSubject: "INFLATION",
    steadySubject: "CONSUMER COSTS",
    upDriver: "FIRMS PASS ON HIGHER COSTS",
    downDriver: "INPUT COSTS MODERATE",
    steadyDriver: "DEMAND AND SUPPLY STAY IN BALANCE",
    object: "PRICE GROWTH",
  },
  "policy-rate": {
    subject: "POLICY RATES",
    downSubject: "BORROWING COSTS",
    steadySubject: "MONETARY SETTINGS",
    upDriver: "INFLATION RISKS INTENSIFY",
    downDriver: "POLICYMAKERS MOVE TO EASE",
    steadyDriver: "OFFICIALS WAIT FOR CLEARER DATA",
    object: "THE POLICY STANCE",
  },
};

const headlineTemplates: Record<CycleNewsRegime, readonly string[]> = {
  surging: [
    "{{subject}} JUMPS {{pct}}% AS {{upDriver}}",
    "{{subject}} SURGES {{pct}}% IN A BROAD-BASED UPSWING",
    "{{object}} LEAPS {{pct}}% IN THE LATEST READING",
    "{{subject}} ACCELERATES {{pct}}% AS MOMENTUM QUICKENS",
    "{{object}} SOARS {{pct}}% IN A FRESH EXPANSION WAVE",
    "{{subject}} SPIKES {{pct}}%, TESTING CAPACITY",
    "A {{pct}}% BURST IN {{object}} RESETS THE ECONOMIC PULSE",
    "{{subject}} RACES {{pct}}% HIGHER AS CONFIDENCE RETURNS",
    "{{object}} GATHERS PACE, UP {{pct}}% IN A SHARP TURN",
    "{{subject}} POSTS A {{pct}}% SURGE AS {{upDriver}}",
  ],
  rising: [
    "{{subject}} RISES {{pct}}% AS {{upDriver}}",
    "{{object}} EDGES {{pct}}% HIGHER IN THE LATEST CYCLE",
    "{{subject}} ADDS {{pct}}% IN A STEADIER RECOVERY",
    "{{object}} TICKS UP {{pct}}% AFTER A QUIET PATCH",
    "{{subject}} GAINS {{pct}}% AS CONDITIONS IMPROVE",
    "A {{pct}}% LIFT IN {{object}} POINTS TO BROADENING ACTIVITY",
    "{{subject}} MOVES {{pct}}% HIGHER ON FIRMER CONDITIONS",
    "{{object}} BUILDS WITH A {{pct}}% ADVANCE",
    "{{subject}} TURNS UP BY {{pct}}% IN A MODEST BUT CLEAR SHIFT",
    "{{object}} RECOVERS {{pct}}% AS {{upDriver}}",
  ],
  steady: [
    "{{steadySubject}} HOLDS STEADY AS {{steadyDriver}}",
    "{{steadySubject}} SETTLES INTO A NARROW RANGE",
    "{{steadySubject}} FLATTENS AFTER RECENT VOLATILITY",
    "{{steadySubject}} MARKS TIME WITH NO CLEAR NEW DIRECTION",
    "{{steadySubject}} REMAINS LITTLE CHANGED IN THE LATEST READING",
    "{{steadySubject}} PAUSES AS THE OUTLOOK STAYS MIXED",
    "{{steadySubject}} STABILISES WITH ACTIVITY IN BALANCE",
    "{{steadySubject}} HOLDS ITS COURSE AFTER A CHOPPY RUN",
    "{{steadySubject}} STALLS AS PARTICIPANTS WAIT FOR CLARITY",
    "{{steadySubject}} FINDS EQUILIBRIUM AS {{steadyDriver}}",
  ],
  falling: [
    "{{downSubject}} FALLS {{pct}}% AS {{downDriver}}",
    "{{object}} SLIPS {{pct}}% IN A CAUTIOUS PULLBACK",
    "{{downSubject}} EASES {{pct}}% IN THE LATEST CYCLE",
    "{{object}} RETREATS {{pct}}% AS MOMENTUM FADES",
    "{{downSubject}} LOSES GROUND, DOWN {{pct}}%",
    "A {{pct}}% DECLINE IN {{object}} POINTS TO GROWING CAUTION",
    "{{downSubject}} MOVES {{pct}}% LOWER AS {{downDriver}}",
    "{{object}} COOLS WITH A {{pct}}% FALL",
    "{{downSubject}} WEAKENS {{pct}}% AFTER A STRONG RUN",
    "{{object}} LOSES TRACTION, OFF {{pct}}% IN THE LATEST READING",
  ],
  plunging: [
    "{{downSubject}} PLUNGES {{pct}}% AS {{downDriver}}",
    "{{object}} COLLAPSES {{pct}}% IN A SHARP REVERSAL",
    "{{downSubject}} TUMBLES {{pct}}% IN THE LATEST READING",
    "A {{pct}}% DROP IN {{object}} SIGNALS A DEEPENING SHOCK",
    "{{downSubject}} CRATERS {{pct}}% AS CONDITIONS BREAK",
    "{{object}} SINKS {{pct}}% IN A BROAD RETRENCHMENT",
    "{{downSubject}} FALLS ABRUPTLY, DOWN {{pct}}%",
    "{{object}} SUFFERS A {{pct}}% COLLAPSE",
    "{{downSubject}} DROPS {{pct}}% AS THE CYCLE TURNS HARD",
    "A {{pct}}% RETREAT IN {{object}} FORCES A RAPID RESET",
  ],
};

function resolveTemplate(template: string, language: SectorLanguage) {
  return template.replace(
    /{{(subject|downSubject|steadySubject|upDriver|downDriver|steadyDriver|object)}}/g,
    (_, token: keyof SectorLanguage) => language[token],
  );
}

export const cycleNewsHeadlineLibrary = Object.fromEntries(
  cycleNodeIds.map((nodeId) => [
    nodeId,
    Object.fromEntries(
      cycleNewsRegimes.map((regime) => [
        regime,
        headlineTemplates[regime].map((template) =>
          resolveTemplate(template, sectorLanguage[nodeId]),
        ),
      ]),
    ),
  ]),
) as unknown as CycleNewsHeadlineLibrary;

export function countCycleNewsHeadlines(
  nodeId: CycleNodeId,
) {
  return cycleNewsRegimes.reduce(
    (count, regime) => count + cycleNewsHeadlineLibrary[nodeId][regime].length,
    0,
  );
}

export function cycleNewsHeadlineFor(
  nodeId: CycleNodeId,
  regime: CycleNewsRegime,
  index: number,
  percent: string,
) {
  const pool = cycleNewsHeadlineLibrary[nodeId][regime];
  const template = pool[Math.abs(index) % pool.length];
  return template.replaceAll("{{pct}}", percent);
}
