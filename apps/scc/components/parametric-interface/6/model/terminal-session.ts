export type TerminalSessionLine = {
  id: string;
  kind: "command" | "output";
  text: string;
  active?: boolean;
  activeWord?: string;
};

const PROMPT = "scc@local 6 %";

function shellQuote(value: string, close = true) {
  return `'${value.replaceAll("'", "'\\''")}${close ? "'" : ""}`;
}

function printCommand(words: readonly string[], closeQuote = true) {
  return `printf '%s\\n' ${shellQuote(words.join(" ").toUpperCase(), closeQuote)}`;
}

function cueWords(lyricCues: readonly (readonly string[])[], cueIndex: number) {
  return lyricCues[cueIndex]!
    .join(" ")
    .toUpperCase()
    .split(" ");
}

function completedCueLines(lyricCues: readonly (readonly string[])[], cueIndex: number) {
  const words = cueWords(lyricCues, cueIndex);
  const phrase = words.join(" ");

  return [
    {
      id: `cue-${cueIndex}-command`,
      kind: "command" as const,
      text: `${PROMPT} ${printCommand(words)}`,
    },
    {
      id: `cue-${cueIndex}-output`,
      kind: "output" as const,
      text: phrase,
    },
  ];
}

export function createTerminalSession(
  lyricCues: readonly (readonly string[])[],
  cueIndex: number,
  activeWordPosition: number,
): readonly TerminalSessionLine[] {
  const completedCueIndexes = [-3, -2, -1].map(
    (offset) => (cueIndex + lyricCues.length + offset) % lyricCues.length,
  );
  const currentWords = cueWords(lyricCues, cueIndex);
  const typedWords = currentWords.slice(0, activeWordPosition + 1);
  const isCueComplete = typedWords.length === currentWords.length;

  return [
    ...completedCueIndexes.flatMap((completedCueIndex) =>
      completedCueLines(lyricCues, completedCueIndex),
    ),
    {
      id: `cue-${cueIndex}-active`,
      kind: "command" as const,
      text: `${PROMPT} ${printCommand(typedWords, isCueComplete)}`,
      active: true,
      activeWord: typedWords.at(-1),
    },
  ];
}
