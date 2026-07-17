import type { LifeProfile, ProfileSex } from "./types";

export const POPULATION_SIZE = 25_000;
export const GRID_COLUMNS = 3;
// Compatibility alias for an in-flight Turbopack graph compiled before the
// mobile directory changed from a square grid to a vertical ledger.
export const GRID_SIZE = GRID_COLUMNS;
export const GRID_ROWS = Math.ceil(POPULATION_SIZE / GRID_COLUMNS);
export const VISIBLE_COLUMNS = GRID_COLUMNS;
export const VISIBLE_ROWS = 30;
export const VISIBLE_PROFILE_COUNT = VISIBLE_COLUMNS * VISIBLE_ROWS;
export const SELECTION_ROWS = VISIBLE_ROWS * 10;
export const SELECTED_PROFILE_COUNT = VISIBLE_COLUMNS * SELECTION_ROWS;
export const POPULATION_REFERENCE_DATE = "2024-11-01";

export const demographicBasis = {
  population: {
    referenceDate: POPULATION_REFERENCE_DATE,
    total: 51_810_000,
    ageShares: {
      "0-14": 0.107,
      "15-39": 0.289,
      "40-64": 0.403,
      "65+": 0.201,
    },
    source:
      "https://mods.go.kr/board.es?act=view&bid=203&list_no=437767&mid=a10301010000",
  },
  lifeTable: {
    year: 2024,
    lifeExpectancyAtBirth: { male: 80.8, female: 86.6 },
    source:
      "https://mods.go.kr/board.es?act=view&bid=208&list_no=439533&mid=a10301010000",
  },
  latestVitalMovement: {
    year: 2025,
    status: "provisional",
    births: 254_500,
    deaths: 363_400,
    source:
      "https://mods.go.kr/board.es?act=view&bid=204&list_no=443686&mid=a10301010000",
  },
} as const;

type WeightedValue<T> = readonly [value: T, weight: number];

const surnames: readonly WeightedValue<string>[] = [
  ["김", 21.5], ["이", 14.7], ["박", 8.4], ["최", 4.7], ["정", 4.3],
  ["강", 2.4], ["조", 2.1], ["윤", 2.1], ["장", 2.0], ["임", 1.7],
  ["한", 1.6], ["오", 1.5], ["서", 1.5], ["신", 1.4], ["권", 1.4],
  ["황", 1.4], ["안", 1.4], ["송", 1.4], ["전", 1.2], ["홍", 1.1],
  ["유", 1.0], ["고", 0.9], ["문", 0.9], ["양", 0.8], ["손", 0.8],
  ["배", 0.8], ["백", 0.7], ["허", 0.7], ["남", 0.6], ["심", 0.6],
  ["노", 0.6], ["하", 0.5], ["곽", 0.4], ["성", 0.4], ["차", 0.4],
  ["주", 0.4], ["우", 0.4], ["구", 0.3], ["민", 0.3], ["진", 0.3],
];

const givenNames = {
  senior: {
    male: [
      "영수", "영호", "정수", "성호", "상철", "동수", "재호", "병철", "종수", "태식",
      "기수", "창수", "광호", "정호", "명수", "승호", "진수", "경수", "상호", "재식",
      "철수", "동호", "용수", "성수", "정식", "영철", "광수", "준호", "기철", "재성",
    ],
    female: [
      "영숙", "정숙", "미숙", "경희", "순자", "영자", "명숙", "정희", "미자", "경숙",
      "옥자", "영희", "춘자", "순희", "현숙", "선자", "금자", "인숙", "혜숙", "명자",
      "복순", "은숙", "정자", "영순", "경자", "미경", "선희", "정임", "옥희", "순옥",
    ],
  },
  middle: {
    male: [
      "민수", "준호", "성민", "현우", "정훈", "재현", "동현", "승현", "영진", "상현",
      "진우", "태훈", "정민", "재훈", "경민", "성진", "동욱", "승호", "현석", "재영",
      "시우", "태현", "민석", "정우", "건우", "성훈", "재민", "준영", "상훈", "도현",
    ],
    female: [
      "지영", "미영", "은정", "현정", "수진", "혜진", "정은", "민정", "선영", "유진",
      "지현", "소영", "은영", "미정", "현주", "영미", "수정", "경은", "혜정", "정아",
      "지은", "윤정", "민경", "은주", "선미", "혜영", "성희", "수연", "지혜", "미선",
    ],
  },
  young: {
    male: [
      "민준", "서준", "도윤", "예준", "시우", "하준", "주원", "지호", "지후", "준우",
      "현우", "도현", "건우", "우진", "선우", "서진", "민재", "현준", "연우", "유준",
      "정우", "승민", "태민", "재윤", "은우", "시윤", "지환", "준혁", "성현", "태현",
    ],
    female: [
      "서연", "서윤", "지우", "서현", "민서", "하은", "하윤", "윤서", "지민", "채원",
      "수아", "지아", "지윤", "은서", "다은", "예은", "유나", "소윤", "예린", "채은",
      "지원", "수빈", "가은", "민지", "유진", "혜원", "다인", "예원", "나연", "소연",
    ],
  },
  child: {
    male: [
      "이준", "서준", "하준", "도윤", "은우", "시우", "지호", "예준", "유준", "수호",
      "도현", "선우", "이안", "로운", "우주", "연우", "지한", "시윤", "재윤", "태오",
      "민준", "주원", "건우", "윤우", "도하", "정우", "현우", "준우", "우진", "하민",
    ],
    female: [
      "서아", "이서", "하윤", "지안", "서윤", "아린", "지우", "하은", "시아", "유나",
      "채아", "윤서", "수아", "다온", "나은", "예나", "로아", "서우", "유주", "채원",
      "지유", "가온", "도연", "하린", "예서", "민서", "소율", "연우", "다인", "윤아",
    ],
  },
} as const;

const remainingLifeByAge: Record<ProfileSex, readonly [number, number][]> = {
  male: [
    [0, 80.8], [15, 66.1], [20, 61.2], [25, 56.3], [30, 51.5],
    [35, 46.7], [40, 41.9], [45, 37.2], [50, 32.5], [55, 28.1],
    [60, 23.7], [65, 19.5], [70, 15.5], [75, 11.8], [80, 8.5], [85, 5.9],
  ],
  female: [
    [0, 86.6], [15, 71.9], [20, 66.9], [25, 62.0], [30, 57.1],
    [35, 52.3], [40, 47.4], [45, 42.6], [50, 37.8], [55, 33.1],
    [60, 28.4], [65, 23.7], [70, 19.2], [75, 14.9], [80, 10.9], [85, 7.6],
  ],
};

const cohortTargets = [
  { count: 2_680, minAge: 0, maxAge: 14 },
  { count: 7_230, minAge: 15, maxAge: 39 },
  { count: 10_070, minAge: 40, maxAge: 64 },
  { count: 5_020, minAge: 65, maxAge: 103 },
] as const;

function mulberry32(seed: number) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pickWeighted<T>(values: readonly WeightedValue<T>[], random: () => number) {
  const total = values.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = random() * total;

  for (const [value, weight] of values) {
    cursor -= weight;
    if (cursor <= 0) return value;
  }

  return values[values.length - 1]![0];
}

function ageWeight(age: number) {
  if (age <= 14) return 0.76 + age * 0.025;
  if (age <= 39) return 0.82 + (age - 15) * 0.022;
  if (age <= 64) return 0.86 + Math.exp(-((age - 57) ** 2) / 90) * 0.72;
  return Math.exp(-(age - 65) / 13.5);
}

function pickAge(minAge: number, maxAge: number, random: () => number) {
  const ages = Array.from({ length: maxAge - minAge + 1 }, (_, index) => {
    const age = minAge + index;
    return [age, ageWeight(age)] as const;
  });
  return pickWeighted(ages, random);
}

function pickSex(age: number, random: () => number): ProfileSex {
  const maleShare = age >= 85 ? 0.31 : age >= 65 ? 0.43 : age >= 40 ? 0.5 : 0.512;
  return random() < maleShare ? "male" : "female";
}

function getNamePool(age: number, sex: ProfileSex): readonly string[] {
  if (age >= 65) return givenNames.senior[sex];
  if (age >= 40) return givenNames.middle[sex];
  if (age >= 15) return givenNames.young[sex];
  return givenNames.child[sex];
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createBirthDate(age: number, random: () => number) {
  const month = Math.floor(random() * 12) + 1;
  const day = Math.floor(random() * daysInMonth(2023, month)) + 1;
  const birthdayHasPassed = month < 11 || (month === 11 && day <= 1);
  const year = 2024 - age - (birthdayHasPassed ? 0 : 1);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function interpolateRemainingLife(age: number, sex: ProfileSex) {
  const table = remainingLifeByAge[sex];
  const upperIndex = table.findIndex(([tableAge]) => tableAge >= age);

  if (upperIndex === -1) {
    const [, at85] = table[table.length - 1]!;
    return Math.max(1.15, at85 - (age - 85) * 0.48);
  }

  if (upperIndex === 0) return table[0]![1];
  const [upperAge, upperYears] = table[upperIndex]!;
  const [lowerAge, lowerYears] = table[upperIndex - 1]!;
  const ratio = (age - lowerAge) / (upperAge - lowerAge);
  return lowerYears + (upperYears - lowerYears) * ratio;
}

function normalSample(random: () => number) {
  const u = Math.max(random(), Number.EPSILON);
  const v = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function createDeathDate(age: number, sex: ProfileSex, random: () => number) {
  const expectedRemaining = interpolateRemainingLife(age, sex);
  const sigma = age >= 80 ? 0.52 : age >= 65 ? 0.42 : age >= 15 ? 0.24 : 0.18;
  const multiplier = Math.exp(sigma * normalSample(random) - (sigma * sigma) / 2);
  const remainingYears = Math.max(0.04, expectedRemaining * multiplier);
  const reference = Date.parse(`${POPULATION_REFERENCE_DATE}T00:00:00.000Z`);
  return toIsoDate(new Date(reference + remainingYears * 365.2425 * 86_400_000));
}

function shuffle<T>(values: T[], random: () => number) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target]!, values[index]!];
  }
  return values;
}

function createSyntheticRegistrationNumber(
  birthDate: string,
  sex: ProfileSex,
  random: () => number,
) {
  const [year, month, day] = birthDate.split("-");
  const yearNumber = Number(year);
  const sexCode = yearNumber >= 2000
    ? sex === "male" ? 3 : 4
    : sex === "male" ? 1 : 2;
  const randomDigits = Array.from(
    { length: 5 },
    () => Math.floor(random() * 10),
  );
  const firstPart = `${year!.slice(-2)}${month}${day}`;
  const firstTwelveDigits = [
    ...firstPart.split("").map(Number),
    sexCode,
    ...randomDigits,
  ];
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  const legacyCheckDigit = (
    11 - firstTwelveDigits.reduce(
      (sum, digit, index) => sum + digit * weights[index]!,
      0,
    ) % 11
  ) % 10;
  const deliberatelyInvalidCheckDigit = (legacyCheckDigit + 1) % 10;

  return `${firstPart}-${sexCode}${randomDigits.join("")}${deliberatelyInvalidCheckDigit}`;
}

function createProfiles(): LifeProfile[] {
  const random = mulberry32(0x5cc2024);
  const records: LifeProfile[] = [];

  for (const cohort of cohortTargets) {
    for (let index = 0; index < cohort.count; index += 1) {
      const age = pickAge(cohort.minAge, cohort.maxAge, random);
      const sex = pickSex(age, random);
      const surname = pickWeighted(surnames, random);
      const pool = getNamePool(age, sex);
      const givenName = pool[Math.floor(random() * pool.length)]!;
      const birthDate = createBirthDate(age, random);
      const registrationRandom = mulberry32(0x7aa0000 + records.length);

      records.push({
        id: `npc-${String(records.length + 1).padStart(4, "0")}`,
        name: `${surname}${givenName}`,
        sex,
        birthDate,
        deathDate: createDeathDate(age, sex, random),
        registrationNumber: createSyntheticRegistrationNumber(
          birthDate,
          sex,
          registrationRandom,
        ),
      });
    }
  }

  return shuffle(records, random);
}

export const lifeProfiles: readonly LifeProfile[] = createProfiles();
export const lifeProfilesById = new Map(
  lifeProfiles.map((profile) => [profile.id, profile] as const),
);

const koreanNameCollator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "variant",
  usage: "sort",
});

const profilesSortedByName = [...lifeProfiles].sort(
  (a, b) => koreanNameCollator.compare(a.name, b.name) || a.id.localeCompare(b.id),
);

export const lifeProfilesInSnakeOrder: readonly LifeProfile[] = Array.from(
  { length: GRID_ROWS },
  (_, rowIndex) => {
    const row = profilesSortedByName.slice(
      rowIndex * GRID_COLUMNS,
      (rowIndex + 1) * GRID_COLUMNS,
    );
    return rowIndex % 2 === 0 ? row : row.reverse();
  },
).flat();

export const initialProfileIds = lifeProfilesInSnakeOrder
  .slice(0, SELECTED_PROFILE_COUNT)
  .map((profile) => profile.id);
