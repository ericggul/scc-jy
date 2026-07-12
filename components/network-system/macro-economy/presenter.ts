import type {
  InstitutionId,
  NetworkSystemSnapshot,
} from "@/components/network-system/macro-economy/model";

export type ParameterReading = {
  id: string;
  label: string;
  value: number;
  display: string;
  changeDisplay: string;
  trend: "rising" | "falling" | "steady";
  trendDisplay: "RISING" | "FALLING" | "STEADY";
  chartMaximum: number;
  history: number[];
};

export type InstitutionViewModel = {
  id: InstitutionId;
  code: string;
  title: string;
  readings: ParameterReading[];
  revision: number;
};

type ObservableDefinition = {
  id: string;
  label: string;
  base: number;
  scale: number;
  chartMaximum: number;
  decimals: number;
  unit: string;
  changeUnit: string;
};

const observables: Record<InstitutionId, ObservableDefinition> = {
  "central-bank": {
    id: "policy-rate",
    label: "POLICY RATE",
    base: 3.5,
    scale: 2,
    chartMaximum: 6,
    decimals: 2,
    unit: "%",
    changeUnit: "pp",
  },
  treasury: {
    id: "net-fiscal-flow",
    label: "NET FISCAL FLOW",
    base: 2,
    scale: 4,
    chartMaximum: 6,
    decimals: 2,
    unit: "% GDP",
    changeUnit: "pp",
  },
  banks: {
    id: "credit-growth",
    label: "CREDIT GROWTH",
    base: 4,
    scale: 8,
    chartMaximum: 12,
    decimals: 2,
    unit: "% YoY",
    changeUnit: "pp",
  },
  "private-economy": {
    id: "domestic-demand-growth",
    label: "DOMESTIC DEMAND GROWTH",
    base: 3,
    scale: 6,
    chartMaximum: 9,
    decimals: 2,
    unit: "% YoY",
    changeUnit: "pp",
  },
};

const definitions: Record<
  InstitutionId,
  { code: string; title: string; sources: InstitutionId[] }
> = {
  "central-bank": {
    code: "CB",
    title: "CENTRAL BANK",
    sources: ["central-bank", "private-economy", "banks"],
  },
  treasury: {
    code: "TR",
    title: "TREASURY",
    sources: ["treasury", "central-bank", "private-economy"],
  },
  banks: {
    code: "BK",
    title: "COMMERCIAL BANKS",
    sources: ["banks", "central-bank", "private-economy"],
  },
  "private-economy": {
    code: "PE",
    title: "PRIVATE ECONOMY",
    sources: ["private-economy", "treasury", "banks"],
  },
};

function observableValue(source: InstitutionId, stateValue: number) {
  const observable = observables[source];
  return observable.base + observable.scale * stateValue;
}

function displayLevel(observable: ObservableDefinition, value: number) {
  return `${value.toFixed(observable.decimals)} ${observable.unit}`;
}

function displayChange(observable: ObservableDefinition, value: number) {
  const threshold = 0.5 * 10 ** -observable.decimals;
  const normalized = Math.abs(value) < threshold ? 0 : value;
  return `Δ 1s ${normalized >= 0 ? "+" : ""}${normalized.toFixed(observable.decimals)} ${observable.changeUnit}`;
}

function recentTrend(values: number[]) {
  if (values.length < 8) return "steady" as const;
  const recent = values.slice(-4);
  const previous = values.slice(-8, -4);
  const mean = (window: number[]) =>
    window.reduce((total, value) => total + value, 0) / window.length;
  const difference = mean(recent) - mean(previous);

  if (difference > 0.002) return "rising" as const;
  if (difference < -0.002) return "falling" as const;
  return "steady" as const;
}

export function presentInstitution(
  institutionId: InstitutionId,
  snapshot: NetworkSystemSnapshot,
): InstitutionViewModel {
  const definition = definitions[institutionId];

  return {
    id: institutionId,
    code: definition.code,
    title: definition.title,
    revision: snapshot.revision,
    readings: definition.sources.map((source) => {
      const observable = observables[source];
      const stateHistory = snapshot.history[source];
      const comparisonState =
        stateHistory[Math.max(0, stateHistory.length - 6)] ??
        snapshot.values[source];
      const value = observableValue(source, snapshot.values[source]);
      const comparisonValue = observableValue(source, comparisonState);
      const trend = recentTrend(stateHistory);

      return {
        id: observable.id,
        label: observable.label,
        value,
        display: displayLevel(observable, value),
        changeDisplay: displayChange(observable, value - comparisonValue),
        trend,
        trendDisplay:
          trend === "rising"
            ? "RISING"
            : trend === "falling"
              ? "FALLING"
              : "STEADY",
        chartMaximum: observable.chartMaximum,
        history: stateHistory.map((stateValue) =>
          observableValue(source, stateValue),
        ),
      };
    }),
  };
}

export function linePath(
  values: number[],
  maximum: number,
  width = 100,
  height = 32,
) {
  if (values.length < 2) return "";

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / maximum) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}
