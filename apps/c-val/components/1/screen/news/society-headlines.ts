export type CValSocietyRegime =
  | "surge"
  | "rise"
  | "uptick"
  | "rebound"
  | "flat"
  | "contest"
  | "pullback"
  | "downtick"
  | "slide"
  | "crash";

export type CValSocietyHeadlineContext = {
  price: number;
  dayMove: number;
  openMove: number;
  spreadBps: number;
};

export type CValSocietyHeadlineSelection = {
  templateId: string;
  headline: string;
  topicId: string;
  code: "POL" | "LAB" | "HOME" | "EDU" | "LIFE" | "SOC" | "BIZ" | "MEDIA";
  keywords: readonly string[];
};

type SocietyTone = "positive" | "negative" | "contested";
type Phrase = (context: CValSocietyHeadlineContext) => string;

type SocietyTopic = {
  id: string;
  code: CValSocietyHeadlineSelection["code"];
  subjects: readonly string[];
  effects: Record<SocietyTone, readonly string[]>;
};

type ContextualFrame = (
  subject: string,
  backdrop: string,
  effect: string,
) => string;

const contextualFrames: readonly ContextualFrame[] = [
  (subject, backdrop, effect) => `${backdrop}…${subject}, ${effect}`,
  (subject, backdrop, effect) => `${subject}, ${effect}…${backdrop}`,
  (subject, backdrop, effect) => `${subject} '${effect}'…${backdrop}`,
];

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

const regimePhrases: Record<CValSocietyRegime, readonly Phrase[]> = {
  surge: [
    (p) => `폭등장 ${signed(p.dayMove)}의 과실 배분`,
    () => "주가 폭등이 만든 자산효과",
    () => "기록적 상승장의 사회적 온도차",
    (p) => `${p.price.toFixed(2)}까지 치솟은 시장의 후폭풍`,
  ],
  rise: [
    (p) => `급등세 ${signed(p.dayMove)}의 민생 파급`,
    () => "상승장 혜택의 분배",
    () => "강세장이 바꾼 소비·고용 기대",
    () => "주가 랠리의 체감경기 효과",
  ],
  uptick: [
    () => "소폭 상승의 체감 효과",
    () => "잔잔한 오름세의 지속 가능성",
    () => "미세한 강세가 만든 기대 변화",
    (p) => `주가 ${signed(p.dayMove)} 움직임의 생활경제 파장`,
  ],
  rebound: [
    () => "급락 뒤 미세 반등의 의미",
    () => "되살아난 시장 기대의 지속성",
    () => "반전한 투자심리가 민생에 미칠 영향",
    (p) => `${signed(p.dayMove)} 반등이 만든 안도감`,
  ],
  flat: [
    () => "보합장 속 엇갈린 체감경기",
    () => "방향 잃은 시장과 관망 심리",
    () => "제자리 주가가 드러낸 자산 격차",
    () => "잠잠한 시장 뒤 누적된 사회 불안",
  ],
  contest: [
    () => "매수·매도 경합이 키운 불확실성",
    () => "엇갈린 시장 신호의 사회적 해석",
    () => "고변동 보합장의 책임 공방",
    (p) => `${p.spreadBps.toFixed(1)}bp 유동성 긴장의 파급`,
  ],
  pullback: [
    () => "급등 뒤 되밀림의 경고",
    () => "상승세 꺾인 시장의 민생 여파",
    () => "차익실현 국면의 사회적 온도차",
    (p) => `${signed(p.dayMove)} 반락이 바꾼 기대`,
  ],
  downtick: [
    () => "소폭 하락의 생활경제 신호",
    () => "미세한 약세가 키운 관망 심리",
    () => "작은 낙폭 뒤 커진 불안",
    (p) => `주가 ${signed(p.dayMove)} 움직임의 가계 파장`,
  ],
  slide: [
    (p) => `급락세 ${signed(p.dayMove)}의 민생 충격`,
    () => "하락장이 번진 고용·소비 불안",
    () => "위험회피 확산의 사회적 비용",
    () => "자산가격 급락 뒤 커진 안전망 요구",
  ],
  crash: [
    (p) => `폭락장 ${signed(p.dayMove)}의 사회적 충격`,
    () => "시장 붕괴 공포와 민생 안전망",
    () => "극단적 하락장이 드러낸 자산 불평등",
    (p) => `${p.price.toFixed(2)}까지 밀린 시장의 후폭풍`,
  ],
};

const toneForRegime: Record<CValSocietyRegime, SocietyTone> = {
  surge: "positive",
  rise: "positive",
  uptick: "positive",
  rebound: "positive",
  flat: "contested",
  contest: "contested",
  pullback: "negative",
  downtick: "negative",
  slide: "negative",
  crash: "negative",
};

export const cValSocietyTopics = [
  {
    id: "party-politics",
    code: "POL",
    subjects: ["민주당", "국민의힘", "여당", "야당", "국회 정무위"],
    effects: {
      positive: ["민생 성과론 경쟁", "자본시장 과실 배분 공방", "증시 부양책 주도권 다툼", "중산층 자산효과 해석 엇갈려", "정책 기대 선점 경쟁"],
      negative: ["시장 안정 책임 공방", "투자자 보호책 압박", "민생경제 책임론 격화", "긴급 현안질의 요구", "금융안전망 대책 경쟁"],
      contested: ["경제 프레임 주도권 다툼", "지지층 결집 셈법 복잡", "정책 효과 해석 충돌", "민생 메시지 재정비", "여론 향방 촉각"],
    },
  },
  {
    id: "approval-politics",
    code: "POL",
    subjects: ["여론조사 전문가들", "중도층", "2030 유권자", "수도권 민심", "무당층"],
    effects: {
      positive: ["상승장 효과가 지지율로 번질지 주목", "경제 낙관론의 표심 이동 촉각", "정책 체감도 상승 기대", "자산 보유 여부 따라 평가 갈려", "호황 프리미엄 지속성 주시"],
      negative: ["시장 충격의 지지율 파장 주목", "경제 불안이 표심 흔들지 촉각", "손실 체감에 민심 이탈 우려", "정책 신뢰도 시험대", "위기 대응 평가가 변수"],
      contested: ["주가와 지지율 단순 연결 경계", "엇갈린 경제평가에 표심 안갯속", "자산 격차 따라 민심 분화", "오차범위 공방 재연 가능성", "경제지표 해석 따라 평가 갈려"],
    },
  },
  {
    id: "labor",
    code: "LAB",
    subjects: ["반도체 노조", "대기업 사무직 노조", "플랫폼 노동자", "중소기업 노동계", "노사정"],
    effects: {
      positive: ["성과급 배분 요구 힘 실려", "임금 인상 기대 확산", "주 4.5일제 논의 탄력", "초과이익 공유 기준 쟁점", "보상 격차 해소 요구"],
      negative: ["고용 안정 요구 커져", "임금 동결 우려 확산", "구조조정 경계 수위 높여", "산업별 충격 분담 논쟁", "생계비 방어 교섭 압박"],
      contested: ["성과급 기준 놓고 내부 온도차", "노동시간·보상 교환 논쟁", "정규직·비정규직 격차 부각", "기업별 보상 양극화 논란", "노사 교섭 셈법 복잡"],
    },
  },
  {
    id: "dividend-welfare",
    code: "POL",
    subjects: ["기본사회 진영", "국민배당제 지지층", "재정 전문가들", "청년정책 단체", "복지국가 논쟁"],
    effects: {
      positive: ["국민배당 재원론 재점화", "성장 과실 공유 요구", "사회배당 도입론에 힘", "자산시장 수익의 공공환원 논쟁", "보편배당 실험 요구"],
      negative: ["손실 사회화 우려와 안전망 요구 충돌", "긴급소득 지원론 부상", "재정 투입 우선순위 논쟁", "취약계층 손실보전 요구", "기본소득 재원 논란"],
      contested: ["보편지원과 선별지원 공방", "국민배당 설계론 분화", "증시 성과의 공공성 논쟁", "재정건전성 논쟁 재연", "성장과 분배 프레임 충돌"],
    },
  },
  {
    id: "housing",
    code: "HOME",
    subjects: ["서울 아파트 시장", "무주택 청년", "영끌 가구", "전월세 세입자", "지방 주택시장"],
    effects: {
      positive: ["주식발 자금이 집값으로 번질지 촉각", "갈아타기 수요 기대와 불안 교차", "자산효과에도 세대 격차 여전", "청약 대기층 셈법 복잡", "주거 상향 기대 되살아나"],
      negative: ["담보대출 부담 다시 부각", "역자산효과 우려 확산", "전세보증금 불안과 겹쳐", "영끌 손실 공포 커져", "지역별 하락 충격 차별화"],
      contested: ["주식과 집값 디커플링 논쟁", "매매 대기자 관망 길어져", "보유자·무주택자 체감 엇갈려", "공시가격 부담과 자산효과 충돌", "서울·지방 온도차 확대"],
    },
  },
  {
    id: "education",
    code: "EDU",
    subjects: ["학부모 커뮤니티", "입시학원가", "대학생", "교육복지 단체", "사교육 시장"],
    effects: {
      positive: ["교육비 지출 확대 기대", "반도체 학과 선호 더 강해져", "자녀 계좌 수익 인증 확산", "교육격차 심화 우려도", "해외유학 수요 회복 촉각"],
      negative: ["사교육비 부담 재부각", "학자금·생활비 불안 커져", "취업 선호 보수화 조짐", "교육비 지원 확대 요구", "청년 자산손실이 진로 선택 변수"],
      contested: ["교육열과 자산격차 연결 논쟁", "반도체 쏠림 지속성 의문", "공교육·사교육 체감 온도차", "부모 자산이 기회 좌우하나", "취업 안정성과 전공 선택 저울질"],
    },
  },
  {
    id: "mental-health",
    code: "SOC",
    subjects: ["정신건강복지센터", "청년상담 현장", "생명안전 전문가들", "투자자 커뮤니티", "가족상담 기관"],
    effects: {
      positive: ["과열 뒤 불안·수면장애 경계", "수익 인증 경쟁의 심리부담 주목", "투자 중독 예방교육 필요성", "낙관 편향 점검 목소리", "가족 간 투자 갈등 상담 늘지 촉각"],
      negative: ["투자손실 위기상담 안전망 점검", "극단적 선택 위험 신호 조기대응 촉구", "자살률과 증시의 단순 인과 해석 경계", "빚투 손실 가구 심리지원 요구", "온라인 손실 인증의 모방위험 우려"],
      contested: ["시장 불안과 정신건강 지표 연결 신중론", "투자 스트레스 실태조사 요구", "과잉 공포와 실제 위기 구분 강조", "청년 마음건강 안전망 점검", "재테크 콘텐츠의 불안 증폭 효과 논쟁"],
    },
  },
  {
    id: "consumption",
    code: "LIFE",
    subjects: ["백화점 업계", "편의점", "온라인 쇼핑몰", "여행업계", "외식업계"],
    effects: {
      positive: ["보복소비 기대 솔솔", "고가품 매출 회복 촉각", "예약·객단가 상승 기대", "주말 소비심리 반등 주목", "자산효과가 매출로 번질지"],
      negative: ["지갑 닫힐까 긴장", "할인 경쟁 확대 조짐", "예약 취소 우려", "생필품 중심 소비 재편", "객단가 하락 가능성"],
      contested: ["체감소비는 여전히 제자리", "주주와 비주주 소비격차 부각", "온라인·오프라인 온도차", "고가품과 생필품 양극화", "소비심리 방향 탐색"],
    },
  },
  {
    id: "food-table",
    code: "LIFE",
    subjects: ["한우 판매점", "치킨집 사장들", "대형마트 정육 코너", "회식 상권", "배달앱 자영업자"],
    effects: {
      positive: ["소고기 판매량 늘까 기대", "치킨 주문 폭증 기대감", "삼겹살 대신 한우 찾나", "성과급 회식 특수 촉각", "프리미엄 메뉴 주문 회복 기대"],
      negative: ["소고기 대신 가성비 메뉴로", "치킨 한 마리도 망설일까", "회식 취소 우려 번져", "밥상물가 부담 더 선명", "배달 수수료 부담과 소비 위축 겹쳐"],
      contested: ["주가는 뛰는데 장바구니는 냉랭", "소고기·치킨 소비지표 해석 분분", "회식 특수 기대와 물가 부담 교차", "배달 주문은 아직 관망", "자산시장과 골목매출 온도차"],
    },
  },
  {
    id: "small-business",
    code: "BIZ",
    subjects: ["자영업자", "전통시장 상인", "동네 상권", "프랜차이즈 점주", "소상공인 단체"],
    effects: {
      positive: ["낙수효과 기대 반·의심 반", "매출 회복 기대감", "임대료 상승 우려도 고개", "상권별 체감 차이", "카드매출 반등 촉각"],
      negative: ["소비절벽 재연 우려", "대출 상환 부담 커져", "폐업 공포 다시 확산", "긴급 운영자금 요구", "매출·원가 이중압박"],
      contested: ["증시와 골목경기 괴리 지적", "체감회복 시점 놓고 전망 엇갈려", "지역별 매출 온도차", "온라인 쏠림에 한숨", "정책금융 효과 재점검"],
    },
  },
  {
    id: "employment",
    code: "LAB",
    subjects: ["취업준비생", "반도체 구직자", "공시생", "경력직 이직시장", "채용 플랫폼"],
    effects: {
      positive: ["대기업 선호 더 강해져", "반도체 채용 기대 확대", "성과급 높은 직장 검색 급증할까", "이직 심리 되살아나", "제조업 인재 쏠림 주목"],
      negative: ["안정직 선호 다시 커져", "채용 축소 공포 확산", "취업 준비 장기화 우려", "중소기업 기피 심화 가능성", "이직 계획 보류 움직임"],
      contested: ["연봉과 안정성 사이 고민", "산업별 채용 양극화", "반도체 쏠림의 지속성 논쟁", "스펙 투자 효과 재점검", "구직자 기대와 현장 채용 괴리"],
    },
  },
  {
    id: "generation",
    code: "SOC",
    subjects: ["2030 투자자", "은퇴 세대", "무주택 청년", "중년 가장", "미성년 주주 부모들"],
    effects: {
      positive: ["세대별 자산효과 극명", "조기 은퇴 꿈 다시 확산", "수익 인증 경쟁 과열", "부모찬스 논쟁 재점화", "노후자산 회복 기대"],
      negative: ["빚투 후유증 우려", "노후자산 방어 비상", "세대 갈등 더 깊어질까", "부모 계좌까지 흔들", "자산 없는 청년 박탈감"],
      contested: ["세대별 체감 완전히 달라", "주주·비주주 격차 논쟁", "자산계층 이동 가능성 갑론을박", "노동소득과 자본소득 충돌", "투자 조기교육 열풍 재점검"],
    },
  },
  {
    id: "regional",
    code: "SOC",
    subjects: ["수도권", "충청 반도체 벨트", "영남 제조업 도시", "호남 지역경제", "인구감소 지역"],
    effects: {
      positive: ["산업 투자 유치 기대", "지역 소비 회복 촉각", "일자리 낙수효과 주목", "수도권 집중 우려도", "지방세수 개선 기대"],
      negative: ["지역 고용 충격 우려", "수도권과 격차 확대", "산업도시 상권 긴장", "청년 유출 가속 걱정", "지방재정 안전판 요구"],
      contested: ["지역별 체감경기 제각각", "반도체 호황의 지역 편중 논쟁", "수도권 집중 해법 공방", "산업단지 기대와 주거 부담 교차", "지역균형발전 효과 재점검"],
    },
  },
  {
    id: "media-nationalism",
    code: "MEDIA",
    subjects: ["경제 유튜브", "국뽕TV 채널", "온라인 종목방", "증권 커뮤니티", "숏폼 제작자"],
    effects: {
      positive: ["'세계 1등'식 썸네일 경쟁", "코스피 신기록 서사 쏟아져", "SK하이닉스 성공담 재소환", "상승장 영웅 만들기 과열", "수익 인증 콘텐츠 급증"],
      negative: ["폭락 음모론 확산 경계", "공포 썸네일 경쟁", "사이드카 기억 소환", "손실 책임 떠넘기기 콘텐츠", "확인 안 된 위기설 주의보"],
      contested: ["국뽕과 비관론 정면충돌", "알고리즘이 키운 전망 양극화", "코스피·하이닉스 소환 경쟁", "팩트와 밈 경계 흐려져", "조회수 장사 논쟁"],
    },
  },
  {
    id: "ceo-culture",
    code: "BIZ",
    subjects: ["대기업 CEO들", "반도체 경영진", "재계 총수", "스타트업 대표들", "상장사 임원진"],
    effects: {
      positive: ["성과급 잔치 메시지 고심", "치킨 회동 같은 인간적 연출까지 주목", "주주환원 약속 경쟁", "직원 보상 확대 압박", "호황 자축과 사회책임 사이 고민"],
      negative: ["비상경영 메시지 잇따를까", "보수 반납 압박 커져", "구조조정설 진화 나서", "직원 달래기 행보 촉각", "위기 책임론 직면"],
      contested: ["주주와 직원 사이 셈법 복잡", "치킨 먹는 CEO 이미지도 전략인가", "배당과 임금 우선순위 논쟁", "말 한마디가 시장 흔들까", "소통 행보 진정성 시험대"],
    },
  },
  {
    id: "household-debt",
    code: "HOME",
    subjects: ["빚투 가구", "신용대출 차주", "주담대 보유자", "고금리 취약차주", "가계부채 전문가들"],
    effects: {
      positive: ["상환 여력 개선 기대", "대출 갚을까 더 투자할까", "담보가치 상승 안도", "부채 축소 기회론", "추가 레버리지 경계"],
      negative: ["반대매매 공포 커져", "원리금 상환 부담 부각", "다중채무 안전망 요구", "손실 만회성 대출 경계", "가계부채 부실 전이 우려"],
      contested: ["부채 상환과 재투자 저울질", "자산가격과 상환능력 괴리", "레버리지 규제 논쟁", "차주별 체감 차이", "금융교육 필요성 재부각"],
    },
  },
  {
    id: "social-safety",
    code: "SOC",
    subjects: ["복지 현장", "지방자치단체", "사회복지사", "청년지원 기관", "금융상담 창구"],
    effects: {
      positive: ["자산 호황에서 소외된 계층 주목", "복지 사각지대 더 선명", "자립지원과 자산형성 연계 요구", "청년 자산계좌 정책 관심", "사회안전망의 분배 기능 논쟁"],
      negative: ["긴급복지 상담 증가 대비", "채무·주거·정신건강 통합지원 요구", "취약가구 조기발견 체계 점검", "손실 가구 생계지원 논쟁", "위기 신호 연계 대응 촉구"],
      contested: ["자산시장과 복지정책 연결 공방", "현금지원 효과 갑론을박", "보편·선별 안전망 경계 재점검", "지역별 지원격차 부각", "금융복지 상담 역할 확대론"],
    },
  },
  {
    id: "culture-leisure",
    code: "LIFE",
    subjects: ["공연계", "프로스포츠 구단", "국내 여행지", "영화관", "게임업계"],
    effects: {
      positive: ["티켓 소비 회복 기대", "고가 좌석 판매 늘까", "주말 여행 예약 촉각", "팬덤 소비 열기 확산", "여가비 지출 양극화도"],
      negative: ["관람료 부담 더 크게 체감", "예약 취소 우려", "가성비 콘텐츠 선호", "후원·광고 위축 걱정", "여가비부터 줄일까"],
      contested: ["자산효과가 문화소비로 번질지", "팬덤별 체감 온도차", "무료 콘텐츠 쏠림 지속", "고가 경험과 일상 여가 양극화", "소비 회복 신호는 아직 혼조"],
    },
  },
] as const satisfies readonly SocietyTopic[];

export const cValSocietyTopicIds = cValSocietyTopics.map(({ id }) => id);

const societyRegimes = Object.keys(regimePhrases) as CValSocietyRegime[];

const topicKeywords: Record<string, readonly string[]> = {
  "party-politics": ["민주당", "국민의힘", "여당", "야당", "민생", "국회"],
  "approval-politics": ["지지율", "중도층", "2030", "수도권 민심", "무당층", "여론조사"],
  labor: ["노조", "성과급", "임금", "주 4.5일제", "비정규직", "노사정"],
  "dividend-welfare": ["국민배당제", "사회배당", "기본소득", "재정", "보편지원", "선별지원"],
  housing: ["부동산", "아파트", "영끌", "전월세", "청약", "지역격차"],
  education: ["교육열", "사교육비", "입시", "국가장학금", "반도체학과", "교육격차"],
  "mental-health": ["정신건강", "투자손실", "빚투", "위기상담", "자살예방", "인과해석"],
  consumption: ["소비", "백화점", "편의점", "여행", "외식", "자산효과"],
  "food-table": ["소고기", "한우", "치킨", "회식", "배달", "밥상물가"],
  "small-business": ["자영업", "소상공인", "골목상권", "카드매출", "정책금융", "폐업"],
  employment: ["취업", "반도체채용", "공시생", "이직", "연봉", "쉬었음청년"],
  generation: ["2030투자자", "은퇴세대", "부모찬스", "자산격차", "노후자산", "미성년주주"],
  regional: ["수도권", "반도체벨트", "지역경제", "인구감소", "지방세수", "균형발전"],
  "media-nationalism": ["국뽕TV", "경제유튜브", "숏폼", "코스피", "SK하이닉스", "사이드카"],
  "ceo-culture": ["CEO", "재계총수", "치맥회동", "주주환원", "임원보수", "사회책임"],
  "household-debt": ["가계부채", "신용대출", "주담대", "반대매매", "레버리지", "취약차주"],
  "social-safety": ["사회안전망", "긴급복지", "금융상담", "청년지원", "통합지원", "복지사각지대"],
  "culture-leisure": ["공연", "스포츠", "여행", "영화", "게임", "여가소비"],
};

export const cValSocietyKeywordPool = [...new Set(
  Object.values(topicKeywords).flat(),
)];

export const cValSocietyHeadlineCombinationCount = cValSocietyTopics.reduce(
  (total, topic) => {
    const fixed = (["positive", "negative", "contested"] as const).reduce(
      (toneTotal, tone) => toneTotal
        + topic.subjects.length * topic.effects[tone].length,
      0,
    );
    const contextual = societyRegimes.reduce((regimeTotal, regime) => {
      const tone = toneForRegime[regime];
      return regimeTotal
        + topic.subjects.length
        * topic.effects[tone].length
        * contextualFrames.length
        * regimePhrases[regime].length;
    }, 0);
    return total + fixed + contextual;
  },
  0,
);

function stableHash(value: string) {
  let output = 2166136261;
  for (const character of value) {
    output ^= character.charCodeAt(0);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

function selectionAt(
  topic: SocietyTopic,
  regime: CValSocietyRegime,
  mode: "fixed" | "contextual",
  index: number,
  context: CValSocietyHeadlineContext,
): CValSocietyHeadlineSelection {
  const tone = toneForRegime[regime];
  const effects = topic.effects[tone];
  let cursor = index;
  const effectIndex = cursor % effects.length;
  cursor = Math.floor(cursor / effects.length);
  const subjectIndex = mode === "fixed"
    ? cursor % topic.subjects.length
    : Math.floor(
      cursor / (contextualFrames.length * regimePhrases[regime].length),
    ) % topic.subjects.length;
  const subject = topic.subjects[subjectIndex];
  const effect = effects[effectIndex];

  if (mode === "fixed") {
    return {
      templateId: `society:fixed:${topic.id}:${tone}:${subjectIndex}:${effectIndex}`,
      headline: `${subject}, ${effect}`,
      topicId: topic.id,
      code: topic.code,
      keywords: topicKeywords[topic.id] ?? [],
    };
  }

  cursor = Math.floor(cursor / effects.length);
  const frameIndex = cursor % contextualFrames.length;
  cursor = Math.floor(cursor / contextualFrames.length);
  const phraseIndex = cursor % regimePhrases[regime].length;
  const backdrop = regimePhrases[regime][phraseIndex](context);

  return {
    templateId: `society:contextual:${regime}:${topic.id}:${subjectIndex}:${phraseIndex}:${frameIndex}:${effectIndex}`,
    headline: contextualFrames[frameIndex](subject, backdrop, effect),
    topicId: topic.id,
    code: topic.code,
    keywords: topicKeywords[topic.id] ?? [],
  };
}

export function selectCValSocietyHeadline({
  regime,
  key,
  context,
  excludedTemplateIds,
  preferredTopicIds,
}: {
  regime: CValSocietyRegime;
  key: string;
  context: CValSocietyHeadlineContext;
  excludedTemplateIds: ReadonlySet<string>;
  preferredTopicIds?: readonly string[];
}) {
  const preferred = preferredTopicIds == null
    ? cValSocietyTopics
    : cValSocietyTopics.filter((topic) => preferredTopicIds.includes(topic.id));
  const topics = preferred.length > 0 ? preferred : cValSocietyTopics;
  const tone = toneForRegime[regime];
  const topic = topics[stableHash(`${key}:topic`) % topics.length];
  const fixedCombinations = topic.subjects.length * topic.effects[tone].length;
  const contextualCombinations = fixedCombinations
    * contextualFrames.length
    * regimePhrases[regime].length;
  const preferredMode = stableHash(`${key}:mode`) % 3 === 0
    ? "fixed" as const
    : "contextual" as const;
  const modes = [preferredMode, preferredMode === "fixed" ? "contextual" : "fixed"] as const;

  for (const mode of modes) {
    const combinations = mode === "fixed" ? fixedCombinations : contextualCombinations;
    const start = stableHash(`${key}:${mode}:form`) % combinations;
    for (let offset = 0; offset < combinations; offset += 1) {
      const selection = selectionAt(
        topic,
        regime,
        mode,
        (start + offset) % combinations,
        context,
      );
      if (!excludedTemplateIds.has(selection.templateId)) return selection;
    }
  }

  return selectionAt(topic, regime, "fixed", 0, context);
}
