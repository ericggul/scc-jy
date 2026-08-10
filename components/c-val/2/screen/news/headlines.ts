/* eslint-disable @typescript-eslint/no-unused-vars -- Some distinct editorial forms are intentionally context-invariant. */

export type CValNewsHeadlineContext = {
  price: number;
  dayMove: number;
  openMove: number;
  dayHigh: number;
  dayLow: number;
};

export type CValNewsHeadlineTemplate = {
  id: string;
  family: CValNewsHeadlineFamily;
  render: (context: CValNewsHeadlineContext) => string;
};

export type CValNewsHeadlineFamily =
  | "market-up"
  | "market-down"
  | "market-up-momentum"
  | "market-down-momentum"
  | "stock-up"
  | "stock-down"
  | "retail-buy"
  | "retail-sell"
  | "corporate"
  | "macro"
  | "household"
  | "policy"
  | "reversal";

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function number(value: number) {
  return value.toFixed(2);
}

function defineFamily(
  family: CValNewsHeadlineFamily,
  forms: readonly ((context: CValNewsHeadlineContext) => string)[],
) {
  return forms.map((render, index) => ({
    id: `${family}-${String(index + 1).padStart(2, "0")}`,
    family,
    render,
  }));
}

const catalog = [
  ...defineFamily("market-up", [
    (p) => `주식시장, 개인 매수세 확산에 C-VAL ${number(p.price)} 강세`,
    (p) => `주가 오름폭 키우는 추격매수…C-VAL ${signed(p.dayMove)}`,
    (p) => `시장 위험선호 회복…C-VAL ${number(p.price)} 상승 흐름`,
    (p) => `주식시장 반등에 매수세 유입…C-VAL 고점권 유지`,
    (p) => `주가 상승 흐름 이어져…C-VAL ${signed(p.openMove)} 기록`,
    (p) => `개인 순매수 심리 살아나…C-VAL 상승 탄력 확인`,
    (p) => `장중 강세 확대 구간…C-VAL ${number(p.price)} 재평가`,
    (p) => `위험자산 선호 되살아…C-VAL ${signed(p.dayMove)}`,
    (p) => `주가 고점 돌파 심리 번져…C-VAL 매수 우위`,
    (p) => `주식시장 상승 관성 주목…C-VAL ${number(p.dayHigh)} 고점 시도`,
  ]),
  ...defineFamily("market-down", [
    (p) => `주식시장, 투매 경계 확산에 C-VAL ${number(p.price)} 약세`,
    (p) => `주가 낙폭 키우는 매도 심리…C-VAL ${signed(p.dayMove)}`,
    (p) => `시장 위험회피 강화…C-VAL ${number(p.price)} 하락 흐름`,
    (p) => `주식시장 조정에 매도세 우위…C-VAL 저점권 탐색`,
    (p) => `주가 약세 흐름 이어져…C-VAL ${signed(p.openMove)} 기록`,
    (p) => `개인 손절 심리 번져…C-VAL 하방 압력`,
    (p) => `장중 약세 확대 구간…C-VAL ${number(p.price)} 재조정`,
    (p) => `위험회피 강화…C-VAL ${signed(p.dayMove)}`,
    (p) => `주가 저점 이탈 경계감…C-VAL 매도 우위`,
    (p) => `주식시장 하락 관성 주목…C-VAL ${number(p.dayLow)} 저점 확인`,
  ]),
  ...defineFamily("market-up-momentum", [
    (p) => `성장주 선호 확산…C-VAL ${number(p.price)} 강세`,
    (p) => `고변동 상승장…C-VAL ${signed(p.dayMove)} 반응`,
    (p) => `기술주 랠리 심리 번져…C-VAL 위험선호 회복`,
    (p) => `장중 급등 구간의 매수세…C-VAL 고점권`,
    (p) => `상승 탄력 주목…C-VAL ${number(p.price)} 재차 강세`,
    (p) => `모멘텀 매수 유입…C-VAL ${signed(p.openMove)}`,
    (p) => `강세 흐름 이어져…C-VAL ${number(p.dayHigh)} 고점 시도`,
    (p) => `위험선호 장세 속 C-VAL 상승 폭 확대`,
    (p) => `랠리 구간의 추격 심리…C-VAL ${number(p.price)}`,
    (p) => `장중 강세 지속…C-VAL 매수세 이어져`,
  ]),
  ...defineFamily("market-down-momentum", [
    (p) => `고변동 하락장 경계…C-VAL ${number(p.price)}`,
    (p) => `조정장 매도세…C-VAL ${signed(p.dayMove)}`,
    (p) => `위험회피 장세에 성장주 심리 위축…C-VAL 약세`,
    (p) => `장중 급락 구간…C-VAL 저점권 탐색`,
    (p) => `하락 탄력 주목…C-VAL ${number(p.price)} 약세`,
    (p) => `모멘텀 이탈…C-VAL ${signed(p.openMove)}`,
    (p) => `변동성 확대 장세…C-VAL ${number(p.dayLow)} 저점 확인`,
    (p) => `위험회피 흐름 번져…C-VAL 낙폭 확대`,
    (p) => `조정 구간의 손절 심리…C-VAL ${number(p.price)}`,
    (p) => `주식시장 약세에 C-VAL 매도 압력 지속`,
  ]),
  ...defineFamily("stock-up", [
    (p) => `주식시장 상승 폭 확대…C-VAL ${number(p.price)} 강세`,
    (p) => `주가 반등세 이어져…C-VAL 1D ${signed(p.dayMove)}`,
    (p) => `증시 위험선호 회복…C-VAL ${number(p.price)} 고점권`,
    (p) => `주식 매수세 유입…C-VAL 상승 흐름 재확인`,
    (p) => `증시 강세 전환…C-VAL ${signed(p.openMove)} 기록`,
    (p) => `주가 오름세 지속…C-VAL ${number(p.dayHigh)} 상단 주시`,
    (p) => `증시 상승 탄력 확대…C-VAL 매수 우위`,
    (p) => `주식시장 고점 시도…C-VAL ${number(p.price)} 재차 상승`,
    (p) => `증시 강세장 진입 기대…C-VAL ${signed(p.dayMove)}`,
    (p) => `주가 반등에 투자심리 개선…C-VAL ${number(p.price)}`,
  ]),
  ...defineFamily("stock-down", [
    (p) => `주식시장 낙폭 확대…C-VAL ${number(p.price)} 약세`,
    (p) => `주가 조정세 이어져…C-VAL 1D ${signed(p.dayMove)}`,
    (p) => `증시 위험회피 확산…C-VAL ${number(p.price)} 저점권`,
    (p) => `주식 매도세 출회…C-VAL 하락 흐름 재확인`,
    (p) => `증시 약세 전환…C-VAL ${signed(p.openMove)} 기록`,
    (p) => `주가 내림세 지속…C-VAL ${number(p.dayLow)} 하단 주시`,
    (p) => `증시 하락 탄력 확대…C-VAL 매도 우위`,
    (p) => `주식시장 저점 탐색…C-VAL ${number(p.price)} 재차 하락`,
    (p) => `증시 조정장 진입 경계…C-VAL ${signed(p.dayMove)}`,
    (p) => `주가 약세에 투자심리 위축…C-VAL ${number(p.price)}`,
  ]),
  ...defineFamily("retail-buy", [
    (p) => `개미 매수세 몰리며 C-VAL ${number(p.price)} 상승 탄력`,
    (p) => `개인투자자 추격매수 경계에도 C-VAL ${signed(p.dayMove)}`,
    (p) => `개미들 저가매수 유입…C-VAL 반등 폭 확대`,
    (p) => `개인 순매수 심리 되살아…C-VAL ${number(p.price)}`,
    (p) => `동학개미식 매수세 연상…C-VAL 강세 지속`,
    (p) => `개미 매수 대기층 두터워져…C-VAL 고점권`,
    (p) => `개인투자자 위험선호 회복…C-VAL ${signed(p.openMove)}`,
    (p) => `개미들 상승장 베팅 늘려…C-VAL ${number(p.dayHigh)} 주시`,
    (p) => `개인 매수세에 주가 반등…C-VAL ${number(p.price)}`,
    (p) => `개미 추격매수 심리 확산…C-VAL 상승 흐름`,
  ]),
  ...defineFamily("retail-sell", [
    (p) => `개미 매도 물량 늘며 C-VAL ${number(p.price)} 약세`,
    (p) => `개인투자자 손절 심리 번져…C-VAL ${signed(p.dayMove)}`,
    (p) => `개미들 반등 차익실현 나서…C-VAL 하락 전환`,
    (p) => `개인 매수 대기 관망…C-VAL ${number(p.price)} 저점권`,
    (p) => `동학개미식 저가매수도 주춤…C-VAL 약세 지속`,
    (p) => `개미 매도세에 지지선 시험…C-VAL 하단 주시`,
    (p) => `개인투자자 위험회피 강화…C-VAL ${signed(p.openMove)}`,
    (p) => `개미들 손실회피 매물 출회…C-VAL ${number(p.dayLow)}`,
    (p) => `개인 매도 우위에 주가 밀려…C-VAL ${number(p.price)}`,
    (p) => `개미 관망세 짙어져…C-VAL 하락 흐름`,
  ]),
  ...defineFamily("corporate", [
    (p) => `주가 강세에 기업 자금조달 여건 개선 기대…C-VAL ${number(p.price)}`,
    (p) => `증시 반등에 IPO 시장 온기 전망…C-VAL ${signed(p.dayMove)}`,
    (p) => `주식발행 여건 주시…C-VAL 강세가 기업금융 변수`,
    (p) => `주가 상승에 성장기업 투자심리 회복 기대…C-VAL 고점권`,
    (p) => `증시 흐름이 회사채·주식발행 여건 가를 듯…C-VAL ${number(p.price)}`,
    (p) => `기업금융 시장, C-VAL ${signed(p.openMove)} 움직임 주목`,
    (p) => `주가 반등에 상장·증자 일정 재개 기대…C-VAL 강세`,
    (p) => `위험자산 강세에 기업 투자심리 개선 가능성…C-VAL ${number(p.price)}`,
    (p) => `C-VAL 상승세, 기업 자금조달 비용 완화로 이어질지 주목`,
    (p) => `주가 고점권 유지에 기업공개 시장 회복 기대감`,
  ]),
  ...defineFamily("macro", [
    (p) => `증시 약세에 경기 둔화 우려 재부상…C-VAL ${number(p.price)}`,
    (p) => `위험자산 회피 확산, 경기 민감주 심리 위축 주목`,
    (p) => `주가 하락이 소비·투자심리로 번질지…C-VAL ${signed(p.dayMove)}`,
    (p) => `증시 내림세에 경기 선행 기대 후퇴…C-VAL 약세`,
    (p) => `금융시장 조정, 실물경제 낙관론 약화로 이어질지 주목`,
    (p) => `C-VAL ${number(p.price)} 약세에 위험선호 지표 재점검`,
    (p) => `주가 하락 폭 확대…경기 회복 베팅 주춤`,
    (p) => `증시 약세에 기업 투자심리 위축 가능성`,
    (p) => `위험자산 약세 지속 여부가 경기 전망 가를 듯`,
    (p) => `C-VAL ${signed(p.openMove)}에 시장의 경기 기대 재점검`,
  ]),
  ...defineFamily("household", [
    (p) => `주가 반등에 가계 금융자산 회복 기대…C-VAL ${number(p.price)}`,
    (p) => `개인투자자 평가액 개선 기대감…C-VAL ${signed(p.dayMove)}`,
    (p) => `금융자산 반등이 소비심리로 이어질지 주목`,
    (p) => `C-VAL 강세에 가계 위험자산 선호 회복 기대`,
    (p) => `주가 상승세, 개인 자산효과 되살릴 가능성`,
    (p) => `개미 계좌 회복 기대 커져…C-VAL ${number(p.dayHigh)} 주시`,
    (p) => `증시 반등에 가계 자산가치 개선 기대감`,
    (p) => `C-VAL ${signed(p.openMove)}에 개인 소비심리 변수 부각`,
    (p) => `주가 강세가 가계 금융자산에 미칠 영향 주목`,
    (p) => `개인투자자, C-VAL ${number(p.price)} 상승세에 시선 집중`,
  ]),
  ...defineFamily("policy", [
    (p) => p.dayMove >= 0
      ? "주가 급등에 과열 경계…금융안정 점검 필요성 부각"
      : "주가 급락에 시장안정 점검 필요성 부각",
    (p) => `C-VAL ${signed(p.dayMove)}에 투자자 보호 논의 재점화`,
    (p) => `변동성 확대 구간…시장안정 대응 여력 주시`,
    (p) => p.dayMove >= 0
      ? "주가 강세 속 추격매수 경계 목소리…C-VAL 고점권"
      : "주가 약세 속 저가매수 경계 목소리…C-VAL 저점권",
    (p) => `위험자산 변동성 확대 가능성…시장 참여자 예의주시`,
    (p) => `C-VAL ${number(p.price)} 움직임에 시장안정 지표 재점검`,
    (p) => p.dayMove >= 0
      ? "급등 장세에 과열 감시 필요성도 부각"
      : "급락 장세에 변동성 완화 필요성도 부각",
    (p) => `주가 변동성 커지며 투자자 보호 장치 주목`,
    (p) => p.dayMove >= 0
      ? "금융시장 강세 전환…과도한 위험선호 경계"
      : "금융시장 약세 전환…과도한 위험회피 경계",
    (p) => `C-VAL ${signed(p.openMove)}에 금융안정 대응 필요성 제기`,
  ]),
  ...defineFamily("reversal", [
    (p) => `주가 급반전…C-VAL ${number(p.price)} 방향 재탐색`,
    (p) => `상승세 꺾이고 반대 흐름…C-VAL 1D ${signed(p.dayMove)}`,
    (p) => `급등 뒤 차익실현, C-VAL ${number(p.price)} 변곡점`,
    (p) => `급락 뒤 저가매수 유입…C-VAL 반등 시도`,
    (p) => `주식시장 방향 급변…C-VAL ${number(p.dayLow)}~${number(p.dayHigh)}`,
    (p) => `개미들 엇갈린 베팅…C-VAL ${number(p.price)} 등락 반복`,
    (p) => `위험선호와 회피 교차…C-VAL ${signed(p.dayMove)}`,
    (p) => `주가 반전 구간, 추격매수·저가매수 모두 경계`,
    (p) => `C-VAL ${number(p.price)} 급선회…투자심리 재평가`,
    (p) => `급등·급락 오간 장세…C-VAL 변동성 경계감`,
  ]),
] satisfies readonly CValNewsHeadlineTemplate[];

const familyIndex = new Map<CValNewsHeadlineFamily, CValNewsHeadlineTemplate[]>();
for (const template of catalog) {
  const group = familyIndex.get(template.family) ?? [];
  group.push(template);
  familyIndex.set(template.family, group);
}

function stableIndex(value: string, length: number) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

export function selectCValNewsHeadline({
  families,
  key,
  excludedTemplateIds,
  context,
}: {
  families: readonly CValNewsHeadlineFamily[];
  key: string;
  excludedTemplateIds: ReadonlySet<string>;
  context: CValNewsHeadlineContext;
}) {
  const familyTemplates = families.flatMap((family) => familyIndex.get(family) ?? []);
  const available = familyTemplates.filter((template) => !excludedTemplateIds.has(template.id));
  const fallback = catalog.filter((template) => !excludedTemplateIds.has(template.id));
  const choices = available.length > 0 ? available : fallback.length > 0 ? fallback : catalog;
  const template = choices[stableIndex(key, choices.length)];
  return { templateId: template.id, headline: template.render(context) };
}

export const cValNewsHeadlineTemplateCount = catalog.length;

if (cValNewsHeadlineTemplateCount < 100) {
  throw new Error("C-VAL news catalog must contain at least 100 headline templates.");
}
