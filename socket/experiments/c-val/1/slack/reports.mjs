const MINIMUM_SLACK_INTERVAL_MS = 1_000;
const REPORT_VARIANTS_PER_FAMILY = 10;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function number(value, digits = 2) {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(finite(value));
}

function integer(value) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(
    finite(value),
  );
}

function signedPercent(value, digits = 2) {
  const normalized = finite(value);
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(digits)}%`;
}

function stableHash(value) {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

function participantResting(snapshot, type) {
  return finite(
    snapshot.participants?.find((participant) => participant.type === type)
      ?.restingOrders,
  );
}

function recentOrderStats(snapshot) {
  const orders = Array.isArray(snapshot.recentOrders) ? snapshot.recentOrders : [];
  const submittedQuantity = orders.reduce(
    (total, order) => total + finite(order.quantity),
    0,
  );
  const filledQuantity = orders.reduce(
    (total, order) => total + finite(order.filled),
    0,
  );
  return {
    buys: orders.filter((order) => order.side === "buy").length,
    sells: orders.filter((order) => order.side === "sell").length,
    marketOrders: orders.filter((order) => order.kind === "market").length,
    limitOrders: orders.filter((order) => order.kind === "limit").length,
    submittedQuantity,
    filledQuantity,
  };
}

function reportParameters(snapshot) {
  const market = snapshot.market ?? {};
  const orders = recentOrderStats(snapshot);
  const price = finite(market.index, 100);
  const fundamental = finite(market.fundamental, price);
  const valueGap = ((price / Math.max(fundamental, Number.EPSILON)) - 1) * 100;
  const fillRate =
    orders.submittedQuantity > 0
      ? (orders.filledQuantity / orders.submittedQuantity) * 100
      : 0;
  const oneSecondMove = finite(market.oneSecondMovePercent);
  const orderImbalance = finite(market.orderImbalance);
  return {
    price,
    displayPrice: number(price),
    openingPrice: number(market.openingPrice),
    openMove: finite(market.changeFromOpenPercent),
    displayOpenMove: signedPercent(market.changeFromOpenPercent),
    oneSecondMove,
    displayOneSecondMove: signedPercent(oneSecondMove),
    low: number(market.oneSecondLow),
    high: number(market.oneSecondHigh),
    bestBid: number(market.bestBid),
    bestAsk: number(market.bestAsk),
    spreadBps: number(market.spreadBps, 1),
    depth: integer(market.depth),
    imbalance: orderImbalance,
    displayImbalance: signedPercent(orderImbalance * 100, 1),
    turnover: integer(market.turnover),
    executions: integer(market.executions),
    priceImpactBps: number(market.priceImpactBps, 2),
    realizedVolatilityBps: number(market.realizedVolatilityBps, 1),
    fundamental: number(fundamental),
    valueGap,
    displayValueGap: signedPercent(valueGap),
    liquidityResting: integer(participantResting(snapshot, "liquidity-provider")),
    fundamentalResting: integer(participantResting(snapshot, "fundamental")),
    trendResting: integer(participantResting(snapshot, "trend")),
    noiseResting: integer(participantResting(snapshot, "noise")),
    buyOrders: integer(orders.buys),
    sellOrders: integer(orders.sells),
    marketOrders: integer(orders.marketOrders),
    limitOrders: integer(orders.limitOrders),
    fillRate: `${number(fillRate, 1)}%`,
    submittedOrders: integer(market.submittedOrders),
    cancelledOrders: integer(market.cancelledOrders),
    recentTrades: integer(snapshot.recentTrades?.length),
    volatilityCondition: Math.round(
      finite(snapshot.parameters?.volatility, 0.5) * 100,
    ),
    activityCondition: Math.round(finite(snapshot.parameters?.activity, 0.5) * 100),
    liquidityCondition: Math.round(
      finite(snapshot.parameters?.liquidity, 0.5) * 100,
    ),
    dominantOrderSide:
      orders.buys === orders.sells ? "매수·매도" : orders.buys > orders.sells ? "매수" : "매도",
    orderDifference: integer(Math.abs(orders.buys - orders.sells)),
  };
}

function wordCount(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function lines(...values) {
  return values.filter(Boolean).join("\n\n");
}

const titleSets = {
  surgeUp: [
    (p) => `급등 속보 | ${p.displayPrice} 상단 체결`,
    (p) => `상승 테이프 | ${p.displayPrice}로 가격대 이동`,
    (p) => `매수 체결 경보 | ${p.displayOneSecondMove} 구간`,
    (p) => `호가판 브레이크 | ${p.displayPrice} 재차 갱신`,
    (p) => `강세 장세 뉴스 | 고가 ${p.high} 확인`,
    (p) => `체결 속도판 | ${p.low}에서 ${p.high}`,
    (p) => `상승 흐름 리포트 | 개장 대비 ${p.displayOpenMove}`,
    (p) => `가격발견 알림 | 매수호가 ${p.bestBid}`,
    (p) => `주문장 플래시 | ${p.displayPrice} 부근 압축`,
    (p) => `장세 급변 브리핑 | 최근 1초 ${p.displayOneSecondMove}`,
  ],
  surgeDown: [
    (p) => `급락 속보 | ${p.displayPrice}까지 체결 하향`,
    (p) => `하락 테이프 | 저가 ${p.low} 재확인`,
    (p) => `매도 체결 경보 | ${p.displayOneSecondMove} 구간`,
    (p) => `호가판 이탈 | ${p.displayPrice} 가격대 재편`,
    (p) => `약세 장세 뉴스 | ${p.high}에서 ${p.low}`,
    (p) => `체결 속도판 | ${p.displayPrice} 하단 탐색`,
    (p) => `하락 흐름 리포트 | 개장 대비 ${p.displayOpenMove}`,
    (p) => `가격발견 알림 | 매도호가 ${p.bestAsk}`,
    (p) => `주문장 플래시 | ${p.displayPrice} 부근 매도 압력`,
    (p) => `장세 하방 브리핑 | 최근 1초 ${p.displayOneSecondMove}`,
  ],
  quant: [
    (p) => `퀀트 스냅샷 | 실현변동성 ${p.realizedVolatilityBps}bp`,
    (p) => `마이크로스트럭처 노트 | 충격 ${p.priceImpactBps}bp`,
    (p) => `가격 경로 분석 | ${p.low}–${p.high}`,
    (p) => `변동성 테이프 | 마지막 ${p.displayPrice}`,
    (p) => `수치 브리핑 | 스프레드 ${p.spreadBps}bp`,
    (p) => `체결 분산 리포트 | ${p.recentTrades}건 표본`,
    (p) => `퀀트 데스크 | 주문 불균형 ${p.displayImbalance}`,
    (p) => `가격충격 체크 | 100주당 ${p.priceImpactBps}bp`,
    (p) => `통계형 장세 노트 | 회전율 ${p.turnover}주`,
    (p) => `실현 지표 리포트 | 체결 ${p.executions}건`,
  ],
  orderBook: [
    (p) => `호가판 보고 | ${p.bestBid} / ${p.bestAsk}`,
    (p) => `오더북 업데이트 | 상위 잔량 ${p.depth}주`,
    (p) => `스프레드 모니터 | ${p.spreadBps}bp`,
    (p) => `매수·매도 호가 뉴스 | 마지막 ${p.displayPrice}`,
    (p) => `호가 재배치 알림 | ${p.recentTrades}건 체결`,
    (p) => `거래대기층 리포트 | 유동성 주문 ${p.liquidityResting}건`,
    (p) => `호가 간격 분석 | ${p.bestBid}에서 ${p.bestAsk}`,
    (p) => `주문장 깊이 브리핑 | ${p.depth}주 대기`,
    (p) => `호가판 라이브 | 스프레드 ${p.spreadBps}bp`,
    (p) => `가격대 방어 리포트 | 현재 ${p.displayPrice}`,
  ],
  flow: [
    (p) => `주문흐름 속보 | ${p.dominantOrderSide} ${p.orderDifference}건 우위`,
    (p) => `체결 방향 브리핑 | 불균형 ${p.displayImbalance}`,
    (p) => `매수·매도 플로우 | ${p.buyOrders} 대 ${p.sellOrders}`,
    (p) => `시장가 레이더 | ${p.marketOrders}건 즉시 진입`,
    (p) => `지정가 대기 분석 | ${p.limitOrders}건 잔류`,
    (p) => `주문 충족률 뉴스 | ${p.fillRate}`,
    (p) => `오더플로우 데스크 | 체결 ${p.recentTrades}건`,
    (p) => `체결편향 노트 | ${p.displayImbalance} 신호`,
    (p) => `주문 믹스 브리핑 | MKT ${p.marketOrders} / LMT ${p.limitOrders}`,
    (p) => `흐름 추적 보고 | ${p.displayPrice} 가격대`,
  ],
  liquidity: [
    (p) => `유동성 경보 | 상위 잔량 ${p.depth}주`,
    (p) => `호가 탄성 리포트 | 충격 ${p.priceImpactBps}bp`,
    (p) => `스프레드 감시 | ${p.spreadBps}bp`,
    (p) => `유동성 공급층 뉴스 | 잔존 ${p.liquidityResting}건`,
    (p) => `체결 흡수력 브리핑 | ${p.bestBid} / ${p.bestAsk}`,
    (p) => `호가 방어 노트 | 가격 ${p.displayPrice}`,
    (p) => `잔량 재보충 모니터 | ${p.depth}주`,
    (p) => `시장 깊이 리포트 | 스프레드 ${p.spreadBps}bp`,
    (p) => `유동성 데스크 | 체결가 ${p.displayPrice}`,
    (p) => `호가 완충층 속보 | 공급자 ${p.liquidityResting}건`,
  ],
  valuation: [
    (p) => `가치 괴리 리포트 | 가격 ${p.displayPrice} / 기준 ${p.fundamental}`,
    (p) => `가격 대비 가치 뉴스 | 괴리 ${p.displayValueGap}`,
    (p) => `밸류에이션 체크 | 현재가 ${p.displayPrice}`,
    (p) => `기초가치 관찰 | ${p.fundamental} 기준`,
    (p) => `가격·가치 간격 브리핑 | ${p.displayValueGap}`,
    (p) => `가치추종 주문 노트 | 잔존 ${p.fundamentalResting}건`,
    (p) => `기준가 대비 체결 리포트 | ${p.displayPrice}`,
    (p) => `가치 괴리 속보 | ${p.displayValueGap} 구간`,
    (p) => `밸류 데스크 | 마지막 체결 ${p.displayPrice}`,
    (p) => `가격 재평가 뉴스 | 기초가치 ${p.fundamental}`,
  ],
  volatility: [
    (p) => `변동성 경보 | ${p.realizedVolatilityBps}bp`,
    (p) => `급변 구간 분석 | ${p.low}–${p.high}`,
    (p) => `체결 진폭 리포트 | 최근 1초 ${p.displayOneSecondMove}`,
    (p) => `리스크 테이프 | 가격충격 ${p.priceImpactBps}bp`,
    (p) => `변동성 데스크 | 마지막 ${p.displayPrice}`,
    (p) => `가격 흔들림 뉴스 | 고저 ${p.low} / ${p.high}`,
    (p) => `체결 변동 브리핑 | 스프레드 ${p.spreadBps}bp`,
    (p) => `리스크 레이더 | 실현 ${p.realizedVolatilityBps}bp`,
    (p) => `급변 테이프 | 체결 ${p.recentTrades}건`,
    (p) => `변동 구간 속보 | ${p.displayPrice} 중심`,
  ],
  agents: [
    (p) => `에이전트 모니터 | 유동성 ${p.liquidityResting}건`,
    (p) => `주문층 브리핑 | 가치 ${p.fundamentalResting}건`,
    (p) => `추세 추종 리포트 | 잔존 ${p.trendResting}건`,
    (p) => `흐름 거래자 노트 | ${p.noiseResting}건 대기`,
    (p) => `참여자 지도 | 가격 ${p.displayPrice}`,
    (p) => `에이전트 주문장 | ${p.recentTrades}건 체결`,
    (p) => `주문층 재배치 뉴스 | ${p.displayImbalance}`,
    (p) => `참여자 브리핑 | 공급자 ${p.liquidityResting}건`,
    (p) => `에이전트 흐름 분석 | 추세 ${p.trendResting}건`,
    (p) => `주문군 리포트 | 흐름 ${p.noiseResting}건`,
  ],
  turnover: [
    (p) => `회전율 속보 | 최근 ${p.turnover}주`,
    (p) => `거래 밀도 리포트 | 누적 ${p.executions}건`,
    (p) => `체결 테이프 | 최근 ${p.recentTrades}건`,
    (p) => `거래활동 브리핑 | 주문 ${p.submittedOrders}건`,
    (p) => `거래량 레이더 | ${p.turnover}주 회전`,
    (p) => `체결 집적 뉴스 | 가격 ${p.displayPrice}`,
    (p) => `시장 활동 노트 | 취소 ${p.cancelledOrders}건`,
    (p) => `거래 체력 리포트 | 충족률 ${p.fillRate}`,
    (p) => `테이프 리포트 | ${p.marketOrders}건 시장가`,
    (p) => `체결 빈도 브리핑 | ${p.limitOrders}건 지정가`,
  ],
  risk: [
    (p) => `리스크 속보 | 스프레드 ${p.spreadBps}bp`,
    (p) => `체결 충격 경보 | ${p.priceImpactBps}bp`,
    (p) => `가격 경로 리스크 | ${p.low}–${p.high}`,
    (p) => `호가 공백 감시 | 잔량 ${p.depth}주`,
    (p) => `변동성 위험 브리핑 | ${p.realizedVolatilityBps}bp`,
    (p) => `주문장 경계 신호 | ${p.displayImbalance}`,
    (p) => `가격 이탈 모니터 | ${p.displayPrice}`,
    (p) => `체결 리스크 테이프 | ${p.recentTrades}건`,
    (p) => `시장 탄성 알림 | 공급자 ${p.liquidityResting}건`,
    (p) => `호가판 리스크 뉴스 | ${p.bestBid} / ${p.bestAsk}`,
  ],
  quiet: [
    (p) => `시장 스냅샷 | 마지막 체결 ${p.displayPrice}`,
    (p) => `안정 구간 노트 | 고저 ${p.low} / ${p.high}`,
    (p) => `체결 관찰 | 스프레드 ${p.spreadBps}bp`,
    (p) => `호가판 체크 | ${p.bestBid} / ${p.bestAsk}`,
    (p) => `시장 균형 브리핑 | 불균형 ${p.displayImbalance}`,
    (p) => `거래 흐름 메모 | 최근 ${p.recentTrades}건`,
    (p) => `가격대 리포트 | 개장 대비 ${p.displayOpenMove}`,
    (p) => `주문장 상태 | 상위 잔량 ${p.depth}주`,
    (p) => `체결 정리 | 회전율 ${p.turnover}주`,
    (p) => `관측 리포트 | 가격 ${p.displayPrice}`,
  ],
};

const familyMatches = {
  surgeUp: (p) => p.oneSecondMove >= 0.15 || p.openMove >= 1,
  surgeDown: (p) => p.oneSecondMove <= -0.15 || p.openMove <= -1,
  quant: (p) => p.realizedVolatilityBps >= 12,
  orderBook: (p) => p.spreadBps >= 10,
  flow: (p) => Math.abs(p.imbalance) >= 0.12,
  liquidity: (p) => p.liquidityCondition <= 45 || p.depth > 0,
  valuation: (p) => Math.abs(p.valueGap) >= 0.7,
  volatility: (p) => Math.abs(p.oneSecondMove) >= 0.3 || p.realizedVolatilityBps >= 20,
  agents: () => true,
  turnover: (p) => Number(p.turnover.replaceAll(",", "")) > 0,
  risk: (p) => p.spreadBps >= 18 || p.priceImpactBps >= 1 || p.liquidityCondition <= 38,
  quiet: () => true,
};

export const cValSlackReportTemplates = Object.entries(titleSets).flatMap(
  ([family, headlines]) =>
    headlines.map((headline, variant) => ({
      id: `${family}-${String(variant + 1).padStart(2, "0")}`,
      family,
      variant,
      headline,
    })),
);

const expectedTemplateCount = Object.keys(titleSets).length * REPORT_VARIANTS_PER_FAMILY;
if (cValSlackReportTemplates.length !== expectedTemplateCount || expectedTemplateCount < 100) {
  throw new Error("C-VAL Slack report catalog must contain at least 100 frames.");
}

function agentLayer(p, variant) {
  const forms = [
    `유동성 공급자 ${p.liquidityResting}건, 가치 투자자 ${p.fundamentalResting}건, 추세 추종자 ${p.trendResting}건, 흐름 거래자 ${p.noiseResting}건이 호가판에 남아 있다.`,
    `에이전트 잔존 주문은 공급자 ${p.liquidityResting}건과 가치 ${p.fundamentalResting}건, 추세 ${p.trendResting}건, 흐름 ${p.noiseResting}건으로 분포한다.`,
    `주문층을 나누면 유동성 공급자 ${p.liquidityResting}건이 바닥을 이루고, 가치 ${p.fundamentalResting}건·추세 ${p.trendResting}건·흐름 ${p.noiseResting}건이 그 위에서 가격대에 반응한다.`,
  ];
  return forms[variant % forms.length];
}

function orderLayer(p, variant) {
  const forms = [
    `최근 주문 표본은 매수 ${p.buyOrders}건, 매도 ${p.sellOrders}건이다. 시장가 ${p.marketOrders}건과 지정가 ${p.limitOrders}건 중 수량 기준 ${p.fillRate}가 실제 체결로 연결됐다.`,
    `주문 테이프에는 ${p.dominantOrderSide}가 ${p.orderDifference}건 더 많다. 즉시 체결을 요구한 시장가 ${p.marketOrders}건과 대기 주문 ${p.limitOrders}건의 조합은 충족률 ${p.fillRate}로 남았다.`,
    `제출 주문 ${p.submittedOrders}건 중 취소는 ${p.cancelledOrders}건이다. 최근 표본의 매수 ${p.buyOrders}건·매도 ${p.sellOrders}건, 시장가 ${p.marketOrders}건·지정가 ${p.limitOrders}건은 체결 속도의 재료가 된다.`,
  ];
  return forms[variant % forms.length];
}

function bookLayer(p, variant) {
  const forms = [
    `최우선 호가는 ${p.bestBid} / ${p.bestAsk}이고 스프레드는 ${p.spreadBps}bp다. 상위 5호가 ${p.depth}주가 다음 체결을 흡수하거나 통과시키는 첫 번째 층이다.`,
    `호가판은 매수 ${p.bestBid}, 매도 ${p.bestAsk}에 열려 있다. ${p.spreadBps}bp 간격과 ${p.depth}주 누적 잔량은 가격이 같은 방향으로 움직여도 체결 경로가 달라질 수 있음을 보여준다.`,
    `현재 가격대의 주문장에는 ${p.depth}주가 누적돼 있고 매수·매도 호가 간격은 ${p.spreadBps}bp다. 마지막 체결 ${p.displayPrice}는 이 대기층을 지나서만 갱신된다.`,
  ];
  return forms[variant % forms.length];
}

function valuationLayer(p, variant) {
  const forms = [
    `기초가치 ${p.fundamental} 대비 마지막 체결가 ${p.displayPrice}의 괴리는 ${p.displayValueGap}다. 이 거리는 가치 주문층이 반응할 기준점이면서도, 당장 체결 방향을 대신하지는 않는다.`,
    `가격과 기초가치의 간격은 ${p.displayValueGap}로 집계된다. 가치 ${p.fundamental}과 실제 체결 ${p.displayPrice} 사이의 거리를 줄이는 주문과 넓히는 주문이 같은 호가판에서 만난다.`,
    `기준가 ${p.fundamental}, 체결가 ${p.displayPrice}. 현재 ${p.displayValueGap} 괴리는 가치 투자자 ${p.fundamentalResting}건의 대기 주문과 함께 읽어야 하는 구간이다.`,
  ];
  return forms[variant % forms.length];
}

function measurementLayer(p, variant) {
  const forms = [
    `최근 1초 체결 범위는 ${p.low}에서 ${p.high}, 변화율은 ${p.displayOneSecondMove}다. 실현변동성 ${p.realizedVolatilityBps}bp와 100주당 가격충격 ${p.priceImpactBps}bp가 그 경로의 거칠기를 수치로 남긴다.`,
    `체결가는 ${p.low}–${p.high} 범위에서 움직였고 마지막은 ${p.displayPrice}다. 최근 실현변동성 ${p.realizedVolatilityBps}bp, 가격충격 ${p.priceImpactBps}bp는 방향과 별개로 시장이 주문을 통과시키는 비용을 보여준다.`,
    `최근 ${p.recentTrades}건의 체결이 ${p.low}와 ${p.high} 사이에 남았다. 한 구간 변동 ${p.displayOneSecondMove}, 실현 ${p.realizedVolatilityBps}bp, 충격 ${p.priceImpactBps}bp를 함께 놓고 본다.`,
  ];
  return forms[variant % forms.length];
}

function surgeUpReport(p, frame) {
  return lines(
    frame.headline(p),
    `매수 체결이 가격을 ${p.displayPrice}까지 끌어올렸다. 최근 1초 ${p.displayOneSecondMove}, 개장 대비 ${p.displayOpenMove}이며 고가 ${p.high}가 바로 직전 체결 범위의 상단으로 남아 있다. 상승 자체보다 ${p.low}에서 ${p.high}까지 실제로 어떤 속도로 교환됐는지가 이번 뉴스의 중심이다.`,
    orderLayer(p, frame.variant),
    bookLayer(p, frame.variant),
    agentLayer(p, frame.variant),
    `회전율은 최근 10초 ${p.turnover}주, 누적 체결은 ${p.executions}건이다. 다음 기록에서는 매수 우위 ${p.displayImbalance}가 호가 잔량을 계속 소진하는지, 아니면 ${p.bestAsk} 주변에서 대기 주문으로 흡수되는지를 본다.`,
  );
}

function surgeDownReport(p, frame) {
  return lines(
    frame.headline(p),
    `매도 체결이 마지막 가격을 ${p.displayPrice}까지 낮췄다. 최근 1초 ${p.displayOneSecondMove}, 개장 대비 ${p.displayOpenMove}이며 저가 ${p.low}는 이번 구간의 실제 체결 하단이다. 하락 폭만 보지 않고 ${p.high}에서 ${p.low}로 이동하는 동안 호가가 얼마나 재배치됐는지를 함께 읽는다.`,
    measurementLayer(p, frame.variant),
    orderLayer(p, frame.variant),
    agentLayer(p, frame.variant),
    `현재 주문 불균형은 ${p.displayImbalance}, 상위 호가 잔량은 ${p.depth}주다. 다음 체결에서 ${p.bestBid} 대기층이 유지되는지와 시장가 주문이 추가로 그 가격대를 통과하는지가 하단 가격발견의 다음 장면이 된다.`,
  );
}

function quantReport(p, frame) {
  return lines(
    frame.headline(p),
    `이번 표본은 마지막 ${p.displayPrice}, 한 구간 ${p.displayOneSecondMove}, 고저 ${p.low}–${p.high}로 압축된다. 수익률 방향은 ${p.displayImbalance} 주문 편향과 비교하고, 가격의 흔들림은 실현변동성 ${p.realizedVolatilityBps}bp로 분리한다.`,
    `가격충격은 100주당 ${p.priceImpactBps}bp, 스프레드는 ${p.spreadBps}bp다. 두 값은 같은 체결량이라도 주문장이 가격을 얼마나 민감하게 통과시키는지 보여주는 다른 축이다.`,
    bookLayer(p, frame.variant),
    `최근 체결 ${p.recentTrades}건과 회전율 ${p.turnover}주는 표본의 밀도다. 이후 값은 현재 수치를 연장해 예측하지 않고, 새 주문의 방향·수량·충족률 ${p.fillRate}가 바뀌는 순간 다시 계산한다.`,
  );
}

function orderBookReport(p, frame) {
  return lines(
    frame.headline(p),
    bookLayer(p, frame.variant),
    `마지막 체결 ${p.displayPrice}는 개장가 ${p.openingPrice}에서 ${p.displayOpenMove} 떨어진 위치에 있다. 그러나 현재 호가판은 과거 가격의 요약이 아니라 다음 주문이 실제로 부딪힐 매수 ${p.bestBid}와 매도 ${p.bestAsk}의 대기열이다.`,
    agentLayer(p, frame.variant),
    `최근 주문은 매수 ${p.buyOrders}건과 매도 ${p.sellOrders}건으로 쌓였고, 불균형은 ${p.displayImbalance}다. 호가 간격 ${p.spreadBps}bp가 넓어지는지와 유동성 공급자 ${p.liquidityResting}건이 재보충되는지를 분리해 관찰한다.`,
  );
}

function flowReport(p, frame) {
  return lines(
    frame.headline(p),
    orderLayer(p, frame.variant),
    `마지막 체결은 ${p.displayPrice}, 최근 1초 변화는 ${p.displayOneSecondMove}다. 주문 방향 ${p.dominantOrderSide} 우위가 실제 가격 움직임과 같은 쪽인지, 반대 호가에 흡수되는지는 최근 ${p.recentTrades}건의 체결 테이프에서 확인한다.`,
    `시장가 ${p.marketOrders}건은 즉시 유동성을 찾았고 지정가 ${p.limitOrders}건은 가격대에 남았다. 이 둘의 비중은 단순한 매수·매도 건수보다 체결 속도와 호가 재배치에 더 직접적으로 반영된다.`,
    `상위 잔량 ${p.depth}주와 스프레드 ${p.spreadBps}bp를 같이 보면, 현재 편향 ${p.displayImbalance}가 다음 구간에서 가격으로 이어질 통로가 어느 정도 열려 있는지 읽을 수 있다.`,
  );
}

function liquidityReport(p, frame) {
  return lines(
    frame.headline(p),
    `현재 가격 ${p.displayPrice} 주변에는 상위 5호가 기준 ${p.depth}주가 놓여 있다. 매수 ${p.bestBid}와 매도 ${p.bestAsk}의 간격 ${p.spreadBps}bp는 이 잔량이 어느 가격 차이에서 대기 중인지를 보여준다.`,
    `최근 체결은 ${p.low}–${p.high} 범위를 만들었고, 100주당 가격충격은 ${p.priceImpactBps}bp다. 잔량이 많아도 한쪽 호가에 몰려 있으면 같은 주문이 더 긴 가격 경로를 만들 수 있다.`,
    agentLayer(p, frame.variant),
    `주문 불균형 ${p.displayImbalance}와 충족률 ${p.fillRate}를 함께 보면, 유동성 공급층이 단순히 남아 있는지와 실제 체결을 받아내는지는 다르게 나타난다. 다음 보고에서는 재보충과 철회의 순서를 기록한다.`,
  );
}

function valuationReport(p, frame) {
  return lines(
    frame.headline(p),
    valuationLayer(p, frame.variant),
    `이번 구간의 체결 범위는 ${p.low}–${p.high}, 마지막 가격은 ${p.displayPrice}다. 개장 대비 ${p.displayOpenMove} 변화가 가치 괴리 ${p.displayValueGap}와 나란히 커지거나 줄어드는지에 따라 가치 주문의 상대적 위치가 달라진다.`,
    orderLayer(p, frame.variant),
    `추세 추종자 ${p.trendResting}건과 흐름 거래자 ${p.noiseResting}건의 대기 주문은 직전 가격 경로에 반응하고, 가치 투자자 ${p.fundamentalResting}건은 기준가 쪽 거리를 의식한다. 현재 호가 ${p.bestBid} / ${p.bestAsk}가 이 주문층의 만나는 장소다.`,
  );
}

function volatilityReport(p, frame) {
  return lines(
    frame.headline(p),
    measurementLayer(p, frame.variant),
    `가격은 ${p.displayPrice}, 개장 대비 ${p.displayOpenMove}다. 변동성 수치가 높아도 주문이 한쪽으로 지속된다는 뜻은 아니므로, 매수 ${p.buyOrders}건·매도 ${p.sellOrders}건과 불균형 ${p.displayImbalance}를 별도 층으로 확인한다.`,
    bookLayer(p, frame.variant),
    `유동성 공급자 ${p.liquidityResting}건의 잔존 호가와 시장가 ${p.marketOrders}건의 속도가 동시에 바뀌면, 다음 체결은 직전 가격과 다른 크기의 충격을 남길 수 있다.`,
  );
}

function agentReport(p, frame) {
  return lines(
    frame.headline(p),
    agentLayer(p, frame.variant),
    `마지막 체결 ${p.displayPrice}와 기초가치 ${p.fundamental}의 간격은 ${p.displayValueGap}다. 가치 주문층과 최근 방향을 따르는 추세 주문층이 같은 가격대에 서더라도 주문 목적과 대기 방식은 서로 다르다.`,
    `최근 주문 표본은 매수 ${p.buyOrders}건, 매도 ${p.sellOrders}건이며 시장가 ${p.marketOrders}건과 지정가 ${p.limitOrders}건으로 나뉜다. 충족률 ${p.fillRate}는 이 에이전트층의 주문이 실제 거래로 넘어간 정도를 보여준다.`,
    `현재 호가 ${p.bestBid} / ${p.bestAsk}, 잔량 ${p.depth}주, 불균형 ${p.displayImbalance} 위에서 어떤 에이전트의 주문이 먼저 체결되는지가 다음 가격 기록을 만든다.`,
  );
}

function turnoverReport(p, frame) {
  return lines(
    frame.headline(p),
    `최근 10초 회전율은 ${p.turnover}주이고 누적 체결은 ${p.executions}건이다. 마지막 ${p.displayPrice}는 최근 ${p.recentTrades}건의 체결 테이프 위에 남았으며, 한 구간 변화는 ${p.displayOneSecondMove}다.`,
    `제출 주문 ${p.submittedOrders}건과 취소 ${p.cancelledOrders}건은 거래활동이 단순히 누적되는 것이 아니라 호가를 계속 교체하는 과정임을 보여준다. 시장가 ${p.marketOrders}건이 대기 잔량을 통과한 속도와 지정가 ${p.limitOrders}건의 잔류를 따로 본다.`,
    bookLayer(p, frame.variant),
    `수량 기준 충족률 ${p.fillRate}, 주문 불균형 ${p.displayImbalance}, 가격충격 ${p.priceImpactBps}bp는 거래가 많았는지와 거래가 가격을 얼마나 밀었는지를 구분하는 현재의 세 숫자다.`,
  );
}

function riskReport(p, frame) {
  return lines(
    frame.headline(p),
    `마지막 체결 ${p.displayPrice}는 최근 ${p.low}–${p.high} 범위 안에 있다. 스프레드 ${p.spreadBps}bp, 상위 잔량 ${p.depth}주, 가격충격 ${p.priceImpactBps}bp가 동시에 바뀌면 동일한 주문 수량도 다른 가격 결과를 남길 수 있다.`,
    `실현변동성 ${p.realizedVolatilityBps}bp와 주문 불균형 ${p.displayImbalance}는 각각 체결 경로의 흔들림과 제출 주문의 방향을 가리킨다. 두 숫자가 같은 방향을 뜻하지는 않으므로 분리해 기록한다.`,
    agentLayer(p, frame.variant),
    `시장가 ${p.marketOrders}건·지정가 ${p.limitOrders}건의 조합, 충족률 ${p.fillRate}, 유동성 공급자 ${p.liquidityResting}건의 재보충 여부가 현재 가격대 ${p.bestBid} / ${p.bestAsk}의 다음 취약점을 결정한다.`,
  );
}

function quietReport(p, frame) {
  return lines(
    frame.headline(p),
    `마지막 체결은 ${p.displayPrice}, 개장 대비 ${p.displayOpenMove}, 최근 1초 변화는 ${p.displayOneSecondMove}다. 고저 범위 ${p.low}–${p.high}는 크지 않아도 실제 체결 ${p.recentTrades}건이 그 가격대를 만들었다.`,
    bookLayer(p, frame.variant),
    `최근 주문은 매수 ${p.buyOrders}건과 매도 ${p.sellOrders}건, 시장가 ${p.marketOrders}건과 지정가 ${p.limitOrders}건으로 구성된다. 불균형 ${p.displayImbalance}와 충족률 ${p.fillRate}가 균형을 유지하는지 다음 테이프에서 확인한다.`,
    valuationLayer(p, frame.variant),
    `유동성 공급자 ${p.liquidityResting}건, 가치 ${p.fundamentalResting}건, 추세 ${p.trendResting}건, 흐름 ${p.noiseResting}건의 잔존 주문은 조용한 구간에서도 다음 체결이 시작될 가격대를 준비한다.`,
  );
}

const renderers = {
  surgeUp: surgeUpReport,
  surgeDown: surgeDownReport,
  quant: quantReport,
  orderBook: orderBookReport,
  flow: flowReport,
  liquidity: liquidityReport,
  valuation: valuationReport,
  volatility: volatilityReport,
  agents: agentReport,
  turnover: turnoverReport,
  risk: riskReport,
  quiet: quietReport,
};

const familyTails = {
  surgeUp: [
    (p) => `상승 뉴스의 확인 지점은 ${p.high} 위로 가격이 더 갔는지가 아니라, 그 과정에서 시장가 ${p.marketOrders}건과 지정가 ${p.limitOrders}건이 어떤 순서로 체결됐는지다.`,
    (p) => `상단에서는 추세 추종자 ${p.trendResting}건의 대기 주문과 매도호가 ${p.bestAsk}의 잔량이 같은 가격발견 과정에 들어온다.`,
    (p) => `개장 대비 ${p.displayOpenMove}라는 결과는 이미 기록된 값이고, 다음 체결의 재료는 현재 호가와 주문 불균형 ${p.displayImbalance}다.`,
  ],
  surgeDown: [
    (p) => `하락 뉴스의 핵심은 저가 ${p.low} 자체가 아니라, 그 가격까지 내려오는 동안 매수호가 ${p.bestBid}가 실제로 어느 정도 흡수했는지다.`,
    (p) => `현재가 ${p.displayPrice} 아래의 가격발견은 공급자 ${p.liquidityResting}건의 재보충과 시장가 ${p.marketOrders}건의 속도가 만나는 곳에서 다시 쓰인다.`,
    (p) => `개장 대비 ${p.displayOpenMove}는 누적 결과이고, 다음 기록은 현재 잔량 ${p.depth}주와 주문 편향 ${p.displayImbalance}에서 출발한다.`,
  ],
  quant: [
    (p) => `수치 사이의 관계는 고정되지 않는다. 회전율 ${p.turnover}주가 늘어도 가격충격 ${p.priceImpactBps}bp가 낮아질 수 있고, 반대 조합도 가능하다.`,
    (p) => `퀀트 화면에서는 체결 ${p.recentTrades}건의 개수보다 각 체결이 ${p.bestBid}와 ${p.bestAsk} 사이를 어떻게 통과했는지가 더 긴 정보가 된다.`,
    (p) => `현재 지표는 관측값의 압축이다. 다음 표본은 새 체결이 추가될 때마다 같은 계산으로 갱신되며 직전 숫자를 그대로 반복하지 않는다.`,
  ],
  orderBook: [
    (p) => `호가판의 변화는 체결가보다 먼저 시작될 수 있다. 매수 ${p.bestBid}와 매도 ${p.bestAsk}에 남은 주문 수가 바뀌는 순서를 함께 읽는다.`,
    (p) => `대기 잔량 ${p.depth}주는 한 덩어리가 아니라 각 가격대의 합계다. 따라서 같은 총잔량도 어느 쪽에 놓였는지에 따라 다음 체결은 달라진다.`,
    (p) => `스프레드 ${p.spreadBps}bp는 현재 간격이며, 시장가 주문이 들어오면 그 간격은 체결과 취소, 재보충의 결과로 다시 정해진다.`,
  ],
  flow: [
    (p) => `주문 방향은 ${p.dominantOrderSide} 우위지만, 체결은 반대 호가가 받아낼 때만 완성된다. 그래서 건수 편향과 충족률 ${p.fillRate}를 같이 기록한다.`,
    (p) => `시장가 ${p.marketOrders}건은 속도를 만들고 지정가 ${p.limitOrders}건은 대기열을 만든다. 현재 흐름은 두 주문 종류가 한쪽으로 기울 때 더 선명해진다.`,
    (p) => `불균형 ${p.displayImbalance}는 최근 제출 주문의 요약일 뿐이다. 마지막 ${p.displayPrice}가 그 편향을 따라가는지 여부는 새 체결이 도착해야 확인된다.`,
  ],
  liquidity: [
    (p) => `유동성은 숫자 하나가 아니라 대기 주문의 위치와 재보충 속도다. ${p.depth}주 잔량이 남아도 한쪽 호가가 비면 가격 경로는 달라진다.`,
    (p) => `가격충격 ${p.priceImpactBps}bp는 같은 주문이 현재 호가판에서 남긴 반응이다. 공급자 ${p.liquidityResting}건의 주문이 움직이면 그 반응도 즉시 바뀐다.`,
    (p) => `호가 간격 ${p.spreadBps}bp와 충족률 ${p.fillRate}는 대기 주문의 양과 실제 체결 연결을 따로 보는 두 개의 창이다.`,
  ],
  valuation: [
    (p) => `가격·가치 괴리 ${p.displayValueGap}는 하나의 해석으로 닫히지 않는다. 가치 주문 ${p.fundamentalResting}건과 최근 체결 방향이 만나는 지점에서만 실제 가격이 기록된다.`,
    (p) => `기초가치 ${p.fundamental}은 기준점이고, ${p.displayPrice}는 마지막 실행 결과다. 두 값 사이에는 호가와 주문 흐름이라는 별도의 층이 놓여 있다.`,
    (p) => `가치 관점은 현재 거리 ${p.displayValueGap}를 보여주고, 주문장 관점은 ${p.bestBid} / ${p.bestAsk}에서 그 거리가 언제 거래로 바뀌는지를 보여준다.`,
  ],
  volatility: [
    (p) => `실현변동성 ${p.realizedVolatilityBps}bp는 최근 체결의 흔들림이다. 그 값이 높아도 방향이 지속되는지 여부는 주문 불균형 ${p.displayImbalance}와 별도로 본다.`,
    (p) => `고저 ${p.low}–${p.high}는 이미 통과한 가격대다. 다음 진폭은 현재 잔량 ${p.depth}주와 시장가 ${p.marketOrders}건이 맞붙으며 새로 정해진다.`,
    (p) => `변동 구간에서는 취소 ${p.cancelledOrders}건과 새 주문 ${p.submittedOrders}건의 교체 속도도 중요하다. 호가판은 체결 사이에도 계속 바뀐다.`,
  ],
  agents: [
    (p) => `네 주문층은 같은 결론을 내리지 않는다. 공급자는 호가를 제공하고, 가치는 기준가를 보며, 추세와 흐름 주문은 최근 체결의 방향과 밀도에 반응한다.`,
    (p) => `에이전트별 잔존 주문은 다음 가격을 직접 지정하지 않는다. ${p.bestBid} / ${p.bestAsk}의 대기열에서 반대 주문과 만나야만 실제 체결이 된다.`,
    (p) => `현재 ${p.recentTrades}건의 거래는 여러 주문층이 만난 결과다. 어느 주문군이 남아 있는지와 어느 주문이 먼저 도착하는지는 별개의 정보다.`,
  ],
  turnover: [
    (p) => `회전율 ${p.turnover}주는 활동의 크기이고, 가격 변화 ${p.displayOneSecondMove}는 그 활동이 남긴 결과다. 둘은 함께 커질 수도, 서로 엇갈릴 수도 있다.`,
    (p) => `체결 ${p.executions}건과 취소 ${p.cancelledOrders}건은 같은 시장의 다른 움직임이다. 거래가 늘어도 호가 재배치가 더 빠르면 충족률은 달라질 수 있다.`,
    (p) => `거래 밀도는 시장가 ${p.marketOrders}건과 지정가 ${p.limitOrders}건의 비율, 그리고 ${p.fillRate} 충족률이 바뀌는 순간 다른 성질을 드러낸다.`,
  ],
  risk: [
    (p) => `리스크는 특정 방향을 예고하는 표지가 아니라 현재 주문장이 주문을 통과시키는 조건이다. 스프레드 ${p.spreadBps}bp와 충격 ${p.priceImpactBps}bp를 같이 둔다.`,
    (p) => `상위 잔량 ${p.depth}주가 유지돼도 주문 편향 ${p.displayImbalance}가 계속되면 같은 가격대의 체결 경로는 달라질 수 있다.`,
    (p) => `실현변동성 ${p.realizedVolatilityBps}bp는 이미 일어난 체결에서 계산된다. 다음 구간의 수치는 새 주문과 호가 재배치가 들어온 뒤 다시 결정된다.`,
  ],
  quiet: [
    (p) => `안정 구간도 멈춘 상태는 아니다. 매수 ${p.buyOrders}건과 매도 ${p.sellOrders}건, 취소 ${p.cancelledOrders}건이 계속 호가판의 구성을 바꾼다.`,
    (p) => `가격 ${p.displayPrice}가 좁은 범위에 있어도 상위 잔량 ${p.depth}주와 불균형 ${p.displayImbalance}는 다음 체결이 시작될 위치를 미리 바꾼다.`,
    (p) => `조용한 테이프에서는 가치 괴리 ${p.displayValueGap}와 공급자 ${p.liquidityResting}건의 대기 주문이 가격대의 완충층으로 남아 있다.`,
  ],
};

const familyClosers = {
  surgeUp: (p) => `상승 테이프는 다음 매도 대기층 ${p.bestAsk}에서 다시 시험된다.`,
  surgeDown: (p) => `하락 테이프는 다음 매수 대기층 ${p.bestBid}에서 다시 시험된다.`,
  quant: (p) => `다음 표본은 같은 산식으로 즉시 다시 계산된다.`,
  orderBook: (p) => `다음 호가 변화는 이 대기열의 위치를 다시 바꾼다.`,
  flow: (p) => `다음 주문이 들어오면 이 비율도 곧바로 새로 계산된다.`,
  liquidity: (p) => `다음 체결은 남은 유동성의 위치를 바로 드러낸다.`,
  valuation: (p) => `두 값의 간격은 새 체결마다 다시 기록된다.`,
  volatility: (p) => `다음 체결이 추가되면 이 진폭도 다시 달라진다.`,
  agents: (p) => `새 주문은 이 네 층의 순서를 다시 바꿀 수 있다.`,
  turnover: (p) => `다음 체결이 들어오면 활동의 밀도도 바로 갱신된다.`,
  risk: (p) => `새 주문이 쌓이거나 취소되면 이 조건도 바뀐다.`,
  quiet: (p) => `다음 체결은 그 미세한 재배치의 결과로 남는다.`,
};

function selectTemplate(snapshot, sequence, priorPublication) {
  const parameters = reportParameters(snapshot);
  const eligible = cValSlackReportTemplates.filter((template) =>
    familyMatches[template.family](parameters),
  );
  const pool = eligible.length > 0 ? eligible : cValSlackReportTemplates;
  let index =
    stableHash(
      `${snapshot.runId}:${sequence}:${parameters.price}:${parameters.oneSecondMove}:${parameters.imbalance}:${parameters.spreadBps}`,
    ) % pool.length;
  if (pool[index].id === priorPublication?.templateId) {
    index = (index + 1) % pool.length;
  }
  return pool[index];
}

/** Slack's official sustained limit: one message per channel per second. */
export function cValSlackReportIntervalMs() {
  return MINIMUM_SLACK_INTERVAL_MS;
}

/** Renders one state-matched long-form Korean Slack report without markdown. */
export function renderCValSlackReport(snapshot, sequence, template) {
  const parameters = reportParameters(snapshot);
  const renderer = renderers[template.family];
  if (!renderer) throw new Error(`Unknown C-VAL Slack report family: ${template.family}`);
  const tail = familyTails[template.family]?.[template.variant % 3];
  const closer = familyClosers[template.family];
  const report = lines(
    renderer(parameters, template),
    tail?.(parameters),
    closer?.(parameters),
  );
  const count = wordCount(report);
  if (count < 100 || count > 200) {
    throw new Error(`C-VAL Slack report word count out of range: ${count}`);
  }
  return {
    key: `${snapshot.runId}:${sequence}`,
    text: report,
    blocks: [
      {
        type: "section",
        text: { type: "plain_text", text: report },
      },
    ],
    state: { templateId: template.id },
    wordCount: count,
  };
}

export function presentCValSlackReport(snapshot, sequence, priorPublication) {
  return renderCValSlackReport(
    snapshot,
    sequence,
    selectTemplate(snapshot, sequence, priorPublication),
  );
}
