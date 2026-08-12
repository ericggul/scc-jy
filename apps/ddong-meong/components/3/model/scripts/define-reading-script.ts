import type { ReadingLine } from "../reading-script";

export function defineReadingScript(
  slug: string,
  lines: readonly string[],
): ReadingLine[] {
  return lines.map((text, index) => ({
    id: `${slug}-${String(index + 1).padStart(2, "0")}`,
    text,
  }));
}
