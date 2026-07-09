"use client";

import { useEffect, useMemo, useState } from "react";
import { translationLines } from "./data";

const stepMs = 1100;
const phases = ["input", "converting", "output"] as const;

function getVisibleState(tick: number) {
  const lineIndex = Math.min(
    Math.floor(tick / phases.length),
    translationLines.length - 1,
  );
  const phase = phases[tick % phases.length];
  const completedCount = Math.min(
    Math.floor(tick / phases.length),
    translationLines.length,
  );

  return {
    lineIndex,
    phase,
    completedCount: phase === "output" ? lineIndex + 1 : completedCount,
  };
}

export default function TranslateOne() {
  const [tick, setTick] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const maxTick = translationLines.length * phases.length - 1;
  const visibleState = useMemo(() => getVisibleState(tick), [tick]);
  const isHovering = hoverIndex !== null;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((current) => (current >= maxTick ? 0 : current + 1));
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [maxTick]);

  return (
    <main className="h-dvh w-dvw overflow-scroll bg-[#f7f7f4] text-black">
      <section className="grid min-h-[760px] w-[1280px] shrink-0 grid-rows-[auto_1fr]">
        <div className="grid grid-cols-[minmax(460px,1fr)_minmax(460px,1fr)_112px] border-b border-black text-[clamp(11px,1.1vw,14px)] font-semibold">
          <div className="border-r border-black px-3 py-2">한국어</div>
          <div className="border-r border-black px-3 py-2">日本語</div>
          <div className="px-3 py-2 text-right">状態</div>
        </div>

        <div className="grid min-h-0 grid-rows-6">
          {translationLines.map((line, index) => {
            const isActive = index === visibleState.lineIndex;
            const isComplete = index < visibleState.completedCount;
            const isHoverVisible = isHovering && index <= hoverIndex;
            const showSource =
              isHoverVisible || index < visibleState.lineIndex || isActive;
            const showTarget =
              isHoverVisible ||
              isComplete ||
              (isActive && visibleState.phase === "output");
            const status = isHoverVisible
              ? "表示"
              : isComplete
              ? "完了"
              : isActive
                ? visibleState.phase === "input"
                  ? "入力"
                  : visibleState.phase === "converting"
                    ? "変換"
                    : "出力"
                : "";

            return (
              <div
                key={line.source}
                className="grid min-h-0 grid-cols-[minmax(460px,1fr)_minmax(460px,1fr)_112px] border-b border-black outline-none transition-colors last:border-b-0 hover:bg-white focus-visible:bg-white"
                onBlur={() => setHoverIndex(null)}
                onFocus={() => setHoverIndex(index)}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                tabIndex={0}
              >
                <div className="flex min-w-0 items-center border-r border-black px-3">
                  <p
                    className={`text-[clamp(17px,2.2vw,34px)] font-semibold leading-[1.08] tracking-[-0.03em] transition-opacity duration-300 ${
                      showSource ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {line.source}
                  </p>
                </div>
                <div className="flex min-w-0 items-center border-r border-black px-3">
                  <p
                    lang="ja"
                    className={`text-[clamp(17px,2.2vw,34px)] font-semibold leading-[1.08] tracking-[-0.02em] transition-opacity duration-300 ${
                      showTarget ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {line.target}
                  </p>
                </div>
                <div className="flex items-center justify-end px-3 text-[clamp(11px,1.1vw,14px)] font-semibold">
                  {status}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
