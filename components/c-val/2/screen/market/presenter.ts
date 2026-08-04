import type { CValSnapshot } from "@/components/c-val/2/model";

export function cValIndexPath(
  snapshot: CValSnapshot,
  width = 100,
  height = 40,
) {
  const values = [
    ...snapshot.history.index.slice(0, -1),
    snapshot.market.index,
  ].filter(Number.isFinite);
  if (values.length < 2) return "";
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = Math.max(maximum - minimum, 0.2);
  const low = minimum - spread * 0.12;
  const high = maximum + spread * 0.12;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - low) / (high - low)) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}
