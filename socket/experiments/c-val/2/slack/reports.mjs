const MINIMUM_SLACK_INTERVAL_MS = 1_000;
const REPORT_TEMPLATE_COUNT = 200;

const analystAngles = [
  "개장가 대비 가격 위치가 {openMove}로 확대된 가운데, 최근 체결은 개장 이후 누적 방향을 그대로 유지하는지 점검할 구간이다.",
  "최근 1초 수익률 {oneSecondMove}와 고저 범위 {low}–{high}의 조합은 단순 가격 갱신보다 체결 경로 자체의 압력을 읽게 한다.",
  "최우선 매수호가 {bestBid}, 최우선 매도호가 {bestAsk} 사이에서 마지막 체결가가 어디에 놓이는지가 이번 구간의 가격발견 중심이다.",
  "스프레드 {spreadBps}bp는 거래비용의 대용치이며, 좁아지는 구간에서는 같은 주문량도 더 빠른 체결 연결로 이어질 수 있다.",
  "상위 5호가 누적 잔량 {depth}주는 직전 체결을 받아낼 완충층의 크기를 보여주며, 가격 변화와 별개로 다음 주문의 흡수 여력을 가늠하게 한다.",
  "주문 불균형 {imbalance}는 최근 제출 물량의 편향을 압축한 값이다. 체결가 방향과 이 값이 같은 쪽을 가리키는지 분리해서 볼 필요가 있다.",
  "최근 10초 회전율 {turnover}주는 활동의 밀도를, 누적 체결 {executions}건은 실제 거래가 가격 기록으로 전환된 횟수를 각각 보여준다.",
  "100주당 가격충격 {priceImpactBps}bp는 현재 주문 흐름이 가격을 통과할 때 남기는 흔적의 크기이며, 호가 잔량과 함께 해석해야 한다.",
  "실현변동성 {realizedVolatilityBps}bp는 최근 체결 간 수익률의 흔들림을 반영한다. 방향성 자체와 변동성의 크기를 같은 신호로 섞지 않는다.",
  "기초가치 {fundamental}와 마지막 체결가 {price}의 괴리 {valueGap}는 가치 추종 주문이 가격을 되돌리는지, 흐름 주문이 괴리를 넓히는지 보는 기준점이다.",
  "호가 간격과 누적 잔량이 동시에 변하는 경우에는 표면적인 상승·하락보다 주문장 내부의 재배치가 먼저 나타날 수 있다.",
  "유동성 공급자 잔존 주문 {liquidityResting}건은 양방향 호가의 바닥을 구성한다. 이 수치의 변화는 체결 속도보다 먼저 시장의 탄성을 바꾼다.",
  "가치 투자자 잔존 주문 {fundamentalResting}건은 기초가치와의 거리에서 반응하는 층이다. 가격·가치 괴리와 함께 읽을 때 의미가 생긴다.",
  "추세 추종자 잔존 주문 {trendResting}건은 최근 방향을 따라가는 주문층이다. 가격이 움직인 뒤에도 체결이 이어지는지의 관찰 지점이 된다.",
  "흐름 거래자 잔존 주문 {noiseResting}건은 짧은 구간의 주문 밀도에 참여한다. 이 층의 활동은 방향보다 거래 빈도에 더 직접적으로 드러난다.",
  "최근 주문은 시장가 {marketOrders}건과 지정가 {limitOrders}건으로 나뉜다. 즉시 체결을 요구한 흐름과 호가에 대기한 흐름의 비중을 함께 봐야 한다.",
  "최근 주문 충족률 {fillRate}는 제출된 수량 중 실제로 체결로 연결된 부분을 보여준다. 주문 수 자체보다 유효한 거래 연결을 가늠하는 수치다.",
  "취소 누적 {cancelledOrders}건은 새 주문 누적 {submittedOrders}건과 함께 호가 재배치 속도를 보여준다. 호가가 남아 있어도 구성은 계속 바뀔 수 있다.",
  "최근 체결 {recentTrades}건의 가격대가 {low}–{high}에 모인 것은 이번 구간에서 실제로 교환된 가격의 범위이며, 호가만으로는 대체되지 않는다.",
  "변동성 {volatilityCondition}, 활동성 {activityCondition}, 유동성 {liquidityCondition}의 현재 조합은 주문 빈도·호가 방어·가격 분산에 동시에 반영되는 관측 조건이다.",
];

const deskClosings = [
  "다음 기록에서는 최우선 호가가 유지되는지와 마지막 체결가가 그 사이를 어떤 순서로 통과하는지를 우선 확인한다.",
  "관찰의 핵심은 가격 숫자 하나가 아니라, 주문 불균형과 실제 체결 방향이 계속 같은 쪽을 지지하는지다.",
  "이후 구간에서는 누적 잔량이 회복되는지, 또는 회전율이 먼저 늘어나는지를 함께 기록할 필요가 있다.",
  "가치 괴리는 기준점으로 남기고, 다음 체결이 그 거리를 축소하는지 확대하는지만 분리해서 본다.",
  "스프레드와 가격충격이 동시에 넓어지면 같은 방향의 주문도 체결 경로를 더 크게 바꿀 수 있어 두 수치를 병행한다.",
  "시장가 비중이 유지되는지 지정가 대기가 늘어나는지가 다음 가격발견의 속도를 가르는 관찰 항목이다.",
  "체결 수와 회전율이 늘더라도 방향성이 약해질 수 있으므로, 활동의 양과 주문 편향을 같은 결론으로 묶지 않는다.",
  "유동성 공급자의 잔존 호가가 줄어드는지 재보충되는지가 이후 구간의 완충 여력을 판단하는 핵심이다.",
  "추세·가치·흐름 주문층의 잔존 비중이 바뀌는 순간에는 마지막 가격보다 주문장 재구성이 먼저 신호를 줄 수 있다.",
  "이번 리포트는 현재 체결과 호가의 배치만 기록하며, 다음 구간의 판단은 새로 들어오는 주문과 체결로 갱신한다.",
];

export const cValSlackReportTemplates = analystAngles.flatMap((angle, angleIndex) =>
  deskClosings.map((closing, closingIndex) => ({
    id: `research-${String(angleIndex + 1).padStart(2, "0")}-${String(
      closingIndex + 1,
    ).padStart(2, "0")}`,
    angle,
    closing,
  })),
);

if (cValSlackReportTemplates.length !== REPORT_TEMPLATE_COUNT) {
  throw new Error("C-VAL Slack report template catalog must contain 200 frames.");
}

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

function interpolate(template, parameters) {
  return template.replace(
    /\{(openMove|oneSecondMove|low|high|bestBid|bestAsk|spreadBps|depth|imbalance|turnover|executions|priceImpactBps|realizedVolatilityBps|fundamental|price|valueGap|liquidityResting|fundamentalResting|trendResting|noiseResting|marketOrders|limitOrders|fillRate|cancelledOrders|submittedOrders|recentTrades|volatilityCondition|activityCondition|liquidityCondition)\}/g,
    (_match, key) => parameters[key],
  );
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
  return {
    price: number(price),
    openingPrice: number(market.openingPrice, 2),
    openMove: signedPercent(market.changeFromOpenPercent),
    oneSecondMove: signedPercent(market.oneSecondMovePercent),
    low: number(market.oneSecondLow, 2),
    high: number(market.oneSecondHigh, 2),
    bestBid: number(market.bestBid, 2),
    bestAsk: number(market.bestAsk, 2),
    spreadBps: number(market.spreadBps, 1),
    depth: integer(market.depth),
    imbalance: signedPercent(finite(market.orderImbalance) * 100, 1),
    turnover: integer(market.turnover),
    executions: integer(market.executions),
    priceImpactBps: number(market.priceImpactBps, 2),
    realizedVolatilityBps: number(market.realizedVolatilityBps, 1),
    fundamental: number(fundamental, 2),
    valueGap: signedPercent(valueGap),
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
    volatilityCondition: `${Math.round(finite(snapshot.parameters?.volatility, 0.5) * 100)}`,
    activityCondition: `${Math.round(finite(snapshot.parameters?.activity, 0.5) * 100)}`,
    liquidityCondition: `${Math.round(finite(snapshot.parameters?.liquidity, 0.5) * 100)}`,
    orderSide:
      orders.buys === orders.sells ? "매수와 매도" : orders.buys > orders.sells ? "매수" : "매도",
    orderDifference: integer(Math.abs(orders.buys - orders.sells)),
  };
}

function wordCount(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function selectTemplate(snapshot, sequence, priorPublication) {
  const seed = stableHash(
    `${snapshot.runId}:${sequence}:${snapshot.market?.index}:${snapshot.market?.executions}`,
  );
  let index = seed % cValSlackReportTemplates.length;
  if (cValSlackReportTemplates[index].id === priorPublication?.templateId) {
    index = (index + 1) % cValSlackReportTemplates.length;
  }
  return cValSlackReportTemplates[index];
}

/** Slack's official sustained limit: one message per channel per second. */
export function cValSlackReportIntervalMs() {
  return MINIMUM_SLACK_INTERVAL_MS;
}

/**
 * Renders an approximately 100–200 word Korean desk report solely from the
 * bounded V2 execution snapshot, order book, and participant summaries.
 */
export function renderCValSlackReport(snapshot, sequence, template) {
  const parameters = reportParameters(snapshot);
  const analystAngle = interpolate(template.angle, parameters);
  const report = [
    `*실시간 리서치 노트 | 체결·호가 분석*`,
    `이번 구간의 마지막 체결가는 *${parameters.price}*이다. 개장가 ${parameters.openingPrice} 대비 ${parameters.openMove}, 최근 1초 변동은 ${parameters.oneSecondMove}이며 실제 체결 범위는 ${parameters.low}에서 ${parameters.high}까지 형성됐다. 가격은 최우선 매수 ${parameters.bestBid}, 최우선 매도 ${parameters.bestAsk} 사이의 주문장과 맞물려 기록되고 있다.`,
    `최근 주문 표본에서는 ${parameters.orderSide} 주문이 ${parameters.orderDifference}건 더 많고, 매수 ${parameters.buyOrders}건·매도 ${parameters.sellOrders}건이 확인된다. 제출 주문 중 시장가 ${parameters.marketOrders}건, 지정가 ${parameters.limitOrders}건이며 수량 기준 충족률은 ${parameters.fillRate}다. 누적 주문 ${parameters.submittedOrders}건과 취소 ${parameters.cancelledOrders}건, 최근 체결 ${parameters.recentTrades}건은 호가가 고정된 화면이 아니라 계속 재배치되는 상태임을 보여준다.`,
    `에이전트 쪽에서는 유동성 공급자 ${parameters.liquidityResting}건, 가치 투자자 ${parameters.fundamentalResting}건, 추세 추종자 ${parameters.trendResting}건, 흐름 거래자 ${parameters.noiseResting}건의 잔존 주문이 남아 있다. 기초가치 ${parameters.fundamental} 대비 가격 괴리는 ${parameters.valueGap}이며, 최근 실현변동성은 ${parameters.realizedVolatilityBps}bp, 100주당 가격충격은 ${parameters.priceImpactBps}bp로 집계됐다.`,
    analystAngle,
    `리서치 데스크는 상위 5호가 ${parameters.depth}주, 스프레드 ${parameters.spreadBps}bp, 주문 불균형 ${parameters.imbalance}, 최근 10초 회전율 ${parameters.turnover}주를 같은 화면에서 교차 확인한다. ${template.closing}`,
  ].join("\n\n");
  const count = wordCount(report.replaceAll("*", ""));
  if (count < 100 || count > 200) {
    throw new Error(`C-VAL Slack report word count out of range: ${count}`);
  }
  return {
    key: `${snapshot.runId}:${sequence}`,
    text: report.replaceAll("*", ""),
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: report },
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
