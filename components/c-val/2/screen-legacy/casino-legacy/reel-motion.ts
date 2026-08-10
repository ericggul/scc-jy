export type CasinoReelDefinition = {
  id: string;
  kind: "digit" | "integer" | "sign" | "unit";
  symbol: string;
};

export type CasinoReelSequence = {
  id: number;
  symbols: string[];
  steps: number;
  spinning: boolean;
};

export type CasinoVisibleReelWindow = [top: string, center: string, bottom: string];

const DIGITS = Array.from({ length: 10 }, (_, index) => String(index));
const SIGNS = ["−", "—", "+"];

function symbolSet(kind: CasinoReelDefinition["kind"]) {
  return kind === "sign" ? SIGNS : DIGITS;
}

function adjacentSymbol(reel: CasinoReelDefinition, offset: -1 | 1) {
  if (reel.kind === "unit") return "";
  if (reel.kind === "integer") {
    const value = Number.parseInt(reel.symbol, 10);
    return String(Math.max(0, value + offset));
  }
  const symbols = symbolSet(reel.kind);
  const index = Math.max(0, symbols.indexOf(reel.symbol));
  return symbols[(index + offset + symbols.length) % symbols.length];
}

export function buildCasinoRestingSequence(
  reel: CasinoReelDefinition,
  id: number,
): CasinoReelSequence {
  return {
    id,
    symbols: [adjacentSymbol(reel, -1), reel.symbol, adjacentSymbol(reel, 1)],
    steps: 0,
    spinning: false,
  };
}

export function buildCasinoSpinSequence(
  reel: CasinoReelDefinition,
  previousSymbol: string,
  id: number,
  strength: number,
): CasinoReelSequence {
  if (reel.kind === "integer") {
    const previousValue = Number.parseInt(previousSymbol, 10);
    const targetValue = Number.parseInt(reel.symbol, 10);
    const direction = targetValue >= previousValue ? 1 : -1;
    const steps = Math.max(1, Math.abs(targetValue - previousValue));
    const strip = Array.from({ length: steps + 3 }, (_, index) =>
      String(Math.max(0, previousValue + (index - 1) * direction))
    );
    return { id, symbols: strip, steps, spinning: true };
  }

  const symbols = symbolSet(reel.kind);
  const previousIndex = Math.max(0, symbols.indexOf(previousSymbol));
  const targetIndex = Math.max(0, symbols.indexOf(reel.symbol));
  const directSteps = (targetIndex - previousIndex + symbols.length) % symbols.length;
  const extraTurns = 1 + (strength > 0.58 ? 1 : 0);
  const steps = Math.max(1, directSteps + extraTurns * symbols.length);
  const strip = Array.from({ length: steps + 3 }, (_, index) =>
    symbols[(previousIndex + index - 1 + symbols.length) % symbols.length]
  );

  return { id, symbols: strip, steps, spinning: true };
}

export function getCasinoVisibleWindow(
  sequence: CasinoReelSequence,
  frameIndex: number,
): CasinoVisibleReelWindow {
  const maximumIndex = Math.max(0, sequence.symbols.length - 3);
  const index = Math.min(Math.max(0, frameIndex), maximumIndex);
  return [
    sequence.symbols[index] ?? "",
    sequence.symbols[index + 1] ?? "",
    sequence.symbols[index + 2] ?? "",
  ];
}
