import { slotCount, type QuantizedTransformTarget } from "./data";

export default function GridOverlay({
  target,
}: {
  target: QuantizedTransformTarget;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 grid h-full w-full"
      style={{
        gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${slotCount}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: slotCount * slotCount }, (_, index) => {
        const row = Math.floor(index / slotCount);
        const column = index % slotCount;
        const isActive =
          row === target.languageIndex && column === target.politicalIndex;

        return (
          <div
            key={index}
            className={[
              "border-r border-b border-black/14",
              row === 0 ? "border-t" : "",
              column === 0 ? "border-l" : "",
              isActive ? "bg-black/[0.055] outline outline-2 outline-black" : "",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}
