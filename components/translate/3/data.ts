import {
  getCellText as getBaseCellText,
  languages as baseLanguages,
  type LanguageColumn,
} from "../2/data";

export type ConversationRow = {
  id: string;
  source: string;
};

const subjects = [
  "문장",
  "화면",
  "커서",
  "번역",
  "상태값",
  "대화",
  "입력",
  "출력",
  "표",
  "기계",
];

const motions = [
  "천천히 열린다",
  "다른 열로 이동한다",
  "잠시 멈춘다",
  "이전 행을 다시 부른다",
  "다음 언어를 기다린다",
  "흰 칸 뒤에 숨는다",
  "선택된 축을 따라 번진다",
  "말투를 낮춘다",
  "원문과 거리를 둔다",
  "마지막 셀에서 되돌아온다",
];

export const conversations = Array.from({ length: 100 }, (_, index) => {
  const subject = subjects[index % subjects.length];
  const motion = motions[Math.floor(index / subjects.length) % motions.length];

  return {
    id: `c${String(index + 1).padStart(3, "0")}`,
    source: `${subject}은 ${motion}.`,
  };
}) satisfies ConversationRow[];

const constructedNames = [
  "Aruven", "Belari", "Corvian", "Dathic", "Elym", "Fennar", "Gorathi", "Helion", "Ivaric", "Junoan",
  "Kaeli", "Lomari", "Mireth", "Nauric", "Orinth", "Palevi", "Qadren", "Ruvani", "Soreth", "Tavik",
  "Ulan", "Veyra", "Worun", "Xalith", "Yenari", "Zovek", "Asteri", "Bravan", "Cirel", "Dovian",
  "Erelis", "Falun", "Graevi", "Hathen", "Iskari", "Javeth", "Kelun", "Luthai", "Mavren", "Neska",
  "Orelan", "Pavik", "Qorai", "Rethan", "Seluki", "Torev", "Ulmeni", "Vaskan", "Wethir", "Xovian",
  "Yalara", "Zemric", "Avenku", "Boreli", "Carthi", "Delyra", "Eshun", "Feryn", "Gavari", "Heska",
  "Ilyon", "Joreth", "Kavari", "Lemnos", "Moravi", "Nytha", "Oskari", "Perun", "Quellis", "Raveth",
  "Sythra", "Teleri", "Uveran", "Velith", "Wyran", "Xemora", "Ysolde", "Zairen", "Avaris", "Belyth",
];

const constructedLanguages = constructedNames.map((name, index) => ({
  id: `x${String(index + 1).padStart(2, "0")}`,
  label: name,
  nativeLabel: name,
}));

export const languages = [
  ...baseLanguages,
  ...constructedLanguages,
] satisfies LanguageColumn[];

type BaseLanguageId = (typeof baseLanguages)[number]["id"];

const baseLanguageIds = new Set<string>(
  baseLanguages.map((language) => language.id),
);
const syllables = [
  "ra", "ven", "lo", "mi", "ka", "tho", "sel", "un", "ari", "vek",
  "sha", "dor", "eli", "na", "qu", "os", "tir", "fen", "zal", "io",
];

function getConstructedText(languageIndex: number, rowIndex: number) {
  const offset = languageIndex * 7 + rowIndex * 3;
  const words = Array.from({ length: 7 }, (_, wordIndex) => {
    const a = syllables[(offset + wordIndex * 2) % syllables.length];
    const b = syllables[(offset + wordIndex * 2 + 5) % syllables.length];
    return `${a}${b}`;
  });

  return `${words.slice(0, 3).join(" ")} / ${words.slice(3).join(" ")}.`;
}

export function getCellText(languageId: string, rowIndex: number) {
  if (baseLanguageIds.has(languageId)) {
    return getBaseCellText(languageId as BaseLanguageId, rowIndex % 20);
  }

  const languageIndex = languages.findIndex((language) => language.id === languageId);
  return getConstructedText(languageIndex, rowIndex);
}

export const matrix = conversations.map((_, rowIndex) =>
  languages.map((language) => getCellText(language.id, rowIndex)),
);
