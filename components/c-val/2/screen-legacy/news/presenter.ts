import type { CValSnapshot } from "@/components/c-val/2/model";
import {
  clamp,
  cValPriceChange,
  cValSocialIntensity,
  cValStableHash,
  finite,
  type CValSocialRegime,
} from "../social-presenter";

const contexts = [
  "breaking",
  "price",
  "order-flow",
  "liquidity",
  "corporate-finance",
  "economy",
  "household-wealth",
  "labor",
  "policy",
] as const;

export type CValNewsContext = (typeof contexts)[number];

export type CValNewsSignal = {
  id: CValNewsContext;
  headline: string;
  signature: string;
  regime: CValSocialRegime;
  intensity: number;
  change: number;
};

function signed(value: number, digits = 2) {
  const safeValue = finite(value);
  return `${safeValue >= 0 ? "+" : ""}${safeValue.toFixed(digits)}`;
}

function number(value: number, digits = 0) {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(finite(value));
}

function regimeFor(change: number): CValSocialRegime {
  const safeChange = finite(change);
  if (safeChange <= -3) return "crash";
  if (safeChange < -0.25) return "down";
  if (safeChange >= 3) return "surge";
  if (safeChange > 0.25) return "up";
  return "flat";
}

function shortRegimeFor(change: number): CValSocialRegime {
  const safeChange = finite(change);
  if (safeChange <= -1) return "crash";
  if (safeChange < -0.05) return "down";
  if (safeChange >= 1) return "surge";
  if (safeChange > 0.05) return "up";
  return "flat";
}

function orderFlowRegime(imbalance: number): CValSocialRegime {
  const safeImbalance = finite(imbalance);
  if (safeImbalance <= -0.65) return "crash";
  if (safeImbalance < -0.08) return "down";
  if (safeImbalance >= 0.65) return "surge";
  if (safeImbalance > 0.08) return "up";
  return "flat";
}

function choose(
  pool: readonly string[],
  snapshot: CValSnapshot,
  id: CValNewsContext,
  regime: CValSocialRegime,
) {
  const selection = cValStableHash(
    `${snapshot.runId}:${id}:${regime}:${snapshot.revision}`,
  );
  return pool[selection % pool.length];
}

function headlinesFor(
  snapshot: CValSnapshot,
  id: CValNewsContext,
  regime: CValSocialRegime,
) {
  const market = snapshot.market;
  const index = number(market.index, 2);
  const change = signed(market.changeFromOpenPercent);
  const shortMove = signed(market.oneSecondMovePercent);
  const range = number(market.oneSecondRange, 2);
  const imbalance = signed(market.orderImbalance * 100, 1);
  const imbalanceSide = market.orderImbalance > 0.02
    ? "매수 우위"
    : market.orderImbalance < -0.02
      ? "매도 우위"
      : "매수·매도 균형";
  const direction = market.changeFromOpenPercent > 0.005
    ? "상승"
    : market.changeFromOpenPercent < -0.005
      ? "하락"
      : "보합";

  if (id === "breaking") {
    if (regime === "surge") return [
      `주가지수 ${index}, 개장가 대비 ${change}% 급등`,
      `증시 상승폭 확대…주가지수 ${index} 돌파`,
      `매수세 집중되며 주식시장 ${change}% 치솟아`,
    ];
    if (regime === "up") return [
      `주가지수 ${index}로 상승…개장가 대비 ${change}%`,
      `증시 오름세 지속, 주가지수 ${index} 기록`,
      `주식시장 강세 전환…개장 이후 ${change}%`,
    ];
    if (regime === "crash") return [
      `주가지수 ${index}, 개장가 대비 ${change}% 급락`,
      `증시 낙폭 확대…주가지수 ${index}까지 밀려`,
      `매도세 집중되며 주식시장 ${change}% 추락`,
    ];
    if (regime === "down") return [
      `주가지수 ${index}로 하락…개장가 대비 ${change}%`,
      `증시 약세 지속, 주가지수 ${index} 기록`,
      `주식시장 하락 전환…개장 이후 ${change}%`,
    ];
    return [
      `주가지수 ${index} 보합권…개장가 대비 ${change}%`,
      `증시 방향 탐색…주가지수 ${index}`,
      `주식시장 제한적 등락, 개장가 부근 공방`,
    ];
  }

  if (id === "price") {
    return [
      `주가지수 1초 새 ${shortMove}%…현재 ${index}`,
      `증시 단기 고가 ${number(market.oneSecondHigh, 2)}·저가 ${number(market.oneSecondLow, 2)}`,
      `주식시장 최근 1초 고저폭 ${range}…${direction} 흐름`,
    ];
  }

  if (id === "order-flow") {
    return [
      `주식시장 주문 불균형 ${imbalance}%…${imbalanceSide}`,
      `매수·매도 주문 ${number(market.submittedOrders)}건·체결 ${number(market.executions)}건`,
      `증시 거래량 ${number(market.turnover)}…주문 취소 ${number(market.cancelledOrders)}건`,
    ];
  }

  if (id === "liquidity") {
    return [
      `최우선 매수호가 ${number(market.bestBid, 2)}·매도호가 ${number(market.bestAsk, 2)}`,
      `증시 스프레드 ${number(market.spreadBps, 1)}bp…호가 잔량 ${number(market.depth)}`,
      `주식시장 호가 깊이 ${number(market.depth)}…가격 충격 ${number(market.priceImpactBps, 1)}bp`,
    ];
  }

  if (id === "corporate-finance") {
    if (regime === "surge" || regime === "up") return [
      `증시 ${change}% 상승…기업 자금조달 여건 개선 기대`,
      `주가 강세에 IPO·유상증자 시장 회복 기대감`,
      `증시 반등에 회사채·주식 발행 여건 개선 전망`,
    ];
    if (regime === "crash" || regime === "down") return [
      `증시 ${change}% 하락…기업 자금조달 비용 상승 우려`,
      `주가 약세에 IPO·유상증자 일정 재검토 가능성`,
      `증시 급락에 성장기업 자금조달 위축 우려`,
    ];
    return [
      `기업 자금조달 시장, 증시 방향성 확인하며 관망`,
      `IPO 시장 숨 고르기…투자자 수요 확인 중`,
      `증시 보합권에 기업금융 시장도 신중한 흐름`,
    ];
  }

  if (id === "economy") {
    if (regime === "surge" || regime === "up") return [
      `증시 상승에 경기 회복 기대 확산…위험자산 선호 강화`,
      `주가 반등, 기업·소비 심리 개선으로 이어질지 주목`,
      `증시 강세에 경기 선행 신호 개선 기대감`,
    ];
    if (regime === "crash" || regime === "down") return [
      `증시 하락에 경기 둔화 우려 재부상`,
      `주가 약세, 기업 투자·소비 심리 위축으로 번질지 촉각`,
      `위험자산 회피 확산…실물경제 파급 우려`,
    ];
    return [
      `증시 보합권…경기 방향 둘러싼 관망세 지속`,
      `주가 제한적 등락, 경기 기대도 뚜렷한 방향 없어`,
      `금융시장 숨 고르기…실물경제 신호 확인 대기`,
    ];
  }

  if (id === "household-wealth") {
    if (regime === "surge" || regime === "up") return [
      `주가 상승에 가계 금융자산 평가액 개선 기대`,
      `증시 반등…개인투자자 자산 회복 기대감 커져`,
      `금융자산 가격 상승, 가계 소비심리 회복으로 이어질까`,
    ];
    if (regime === "crash" || regime === "down") return [
      `주가 하락에 가계 금융자산 손실 우려 확대`,
      `증시 급락…개인투자자 평가손실 부담 커져`,
      `금융자산 가격 하락, 가계 소비심리 위축 우려`,
    ];
    return [
      `가계 금융자산 평가액 보합권…투자자 관망`,
      `개인투자자, 방향성 없는 장세에 매매 신중`,
      `증시 횡보에 가계 자산 효과도 제한적`,
    ];
  }

  if (id === "labor") {
    if (regime === "surge" || regime === "up") return [
      `증시 강세에 우리사주·퇴직연금 평가 회복 기대`,
      `주가 상승…성과급·주식보상 가치 개선 기대감`,
      `증시 반등에 근로자 보유 금융자산도 회복 기대`,
    ];
    if (regime === "crash" || regime === "down") return [
      `주가 급락에 우리사주·퇴직연금 손실 우려`,
      `증시 약세…주식보상 가치 하락에 근로자 불안`,
      `금융시장 충격, 고용·임금 협상에 번질지 주목`,
    ];
    return [
      `우리사주·퇴직연금 평가액 보합권`,
      `주가 횡보…주식보상 가치도 큰 변화 없어`,
      `노동계, 금융시장 변동과 고용 영향 예의주시`,
    ];
  }

  if (regime === "surge") return [
    `증시 급등에 과열 경계 목소리…변동성 관리 요구`,
    `가파른 주가 상승, 금융당국 시장 점검 필요성 제기`,
    `변동성 확대에 투자자 보호 강화 요구 커져`,
  ];
  if (regime === "crash") return [
    `증시 급락에 시장 안정 대응 요구 확산`,
    `금융시장 충격 커지자 유동성 점검 필요성 제기`,
    `급락 장세에 투자자 보호·시장 안정 대책 요구`,
  ];
  if (regime === "up") return [
    `증시 상승세 지속…과도한 추격매수 경계`,
    `금융시장 위험선호 회복, 변동성 재확대 가능성 주시`,
    `주가 오름세에 투자자 보호 점검 목소리`,
  ];
  if (regime === "down") return [
    `증시 약세에 금융시장 불안 확산 여부 주시`,
    `주가 하락 지속…시장 유동성 점검 목소리`,
    `투자심리 위축에 금융안정 대응 필요성 제기`,
  ];
  return [
    `금융당국, 변동성 확대 가능성 예의주시`,
    `증시 보합권…시장 안정 지표 점검 지속`,
    `투자자 보호·시장 유동성 점검 요구 이어져`,
  ];
}

export function presentCValNews(snapshot: CValSnapshot): CValNewsSignal[] {
  const cumulativeChange = cValPriceChange(snapshot);
  const shortMove = snapshot.phase === "active"
    ? finite(snapshot.market.oneSecondMovePercent)
    : 0;
  const baseIntensity = cValSocialIntensity(snapshot);

  return contexts.map((id, index) => {
    const change = id === "order-flow"
      ? finite(snapshot.market.orderImbalance) * 100
      : id === "price"
        ? shortMove
        : cumulativeChange;
    const regime = id === "order-flow"
      ? orderFlowRegime(snapshot.market.orderImbalance)
      : id === "price"
        ? shortRegimeFor(shortMove)
        : regimeFor(cumulativeChange);
    const headline = choose(headlinesFor(snapshot, id, regime), snapshot, id, regime);
    const operationalIntensity = id === "liquidity"
      ? clamp(Math.max(snapshot.market.spreadBps / 100, snapshot.market.priceImpactBps / 100), 0, 1)
      : baseIntensity;

    return {
      id,
      headline,
      signature: `${id}:${regime}:${headline}`,
      regime,
      intensity: clamp(operationalIntensity * (0.82 + (index % 3) * 0.09), 0, 1),
      change,
    };
  });
}
