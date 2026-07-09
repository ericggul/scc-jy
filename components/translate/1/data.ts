export type TranslationLine = {
  source: string;
  target: string;
};

export const translationLines = [
  {
    source: "문장이 하나씩 들어오고 있었다.",
    target: "文章がひとつずつ入ってきていた。",
  },
  {
    source: "나는 그것을 설명하려고 했지만, 설명은 조금씩 밀렸다.",
    target: "それを説明しようとしたが、説明は少しずつずれていった。",
  },
  {
    source: "번역기는 뜻보다 순서를 먼저 붙잡았다.",
    target: "翻訳機は意味よりも先に順序をつかまえた。",
  },
  {
    source: "화면은 말하는 사람 없이 말하는 것처럼 보였다.",
    target: "画面は話す人なしに話しているように見えた。",
  },
  {
    source: "일본어가 되자 문장은 더 얌전해졌다.",
    target: "日本語になると、文章はよりおとなしくなった。",
  },
  {
    source: "그러나 어딘가 기계가 남긴 간격이 있었다.",
    target: "しかしどこかに機械が残した間隔があった。",
  },
] as const satisfies readonly TranslationLine[];
