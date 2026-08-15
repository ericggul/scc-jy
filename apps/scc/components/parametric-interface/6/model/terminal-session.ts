import { lyricCues } from "../../model/lyrics";

export type TerminalSessionLine = {
  id: string;
  kind: "command" | "output";
  text: string;
  active?: boolean;
};

const PROMPT = "scc@local 6 %";

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function printCommand(words: readonly string[]) {
  return `printf '%s\\n' ${shellQuote(words.join(" ").toUpperCase())}`;
}

function cueWords(cueIndex: number) {
  return lyricCues[cueIndex]!
    .join(" ")
    .toUpperCase()
    .split(" ");
}

function completedCueLines(cueIndex: number) {
  const words = cueWords(cueIndex);
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
  cueIndex: number,
  activeWordPosition: number,
): readonly TerminalSessionLine[] {
  const completedCueIndexes = [-3, -2, -1].map(
    (offset) => (cueIndex + lyricCues.length + offset) % lyricCues.length,
  );
  const currentWords = cueWords(cueIndex);
  const typedWords = currentWords.slice(0, activeWordPosition + 1);

  return [
    ...completedCueIndexes.flatMap(completedCueLines),
    {
      id: `cue-${cueIndex}-active`,
      kind: "command" as const,
      text: `${PROMPT} ${printCommand(typedWords)}`,
      active: true,
    },
  ];
}
