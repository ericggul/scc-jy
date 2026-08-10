import type { CValSnapshot } from "@/components/c-val/2/model";

export type CValThreeDigitPrice = {
  value: number;
  digits: [string, string, string];
  text: string;
};

export function presentCValThreeDigitPrice(
  snapshot: Pick<CValSnapshot, "market">,
): CValThreeDigitPrice {
  const source = Number.isFinite(snapshot.market.index) ? snapshot.market.index : 100;
  const value = Math.min(999, Math.max(0, Math.round(source)));
  const text = String(value).padStart(3, "0");

  return {
    value,
    digits: [text[0], text[1], text[2]],
    text,
  };
}
