"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

const glyphs = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ가나다라마바사아자차카타파하";

function scramble(source: string, frame: number) {
  return Array.from(source).map((character, index) => {
    if (character.trim() === "") {
      return character;
    }

    const settleFrame = index % 9;
    if (frame > 11 + settleFrame) {
      return character;
    }

    return glyphs[(frame * 17 + index * 11) % glyphs.length];
  }).join("");
}

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function AnimatedMatrixText({
  text,
  active,
  loop,
  reducedMotion,
}: {
  text: string;
  active: boolean;
  loop: boolean;
  reducedMotion: boolean;
}) {
  const [frame, setFrame] = useState(active ? 0 : 4);
  const targetText = text || "";

  useEffect(() => {
    if (reducedMotion || frame >= 20) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFrame((value) => {
        if (loop) {
          return (value + 1) % 18;
        }

        return Math.min(value + 1, 20);
      });
    }, 36);
    return () => window.clearTimeout(timeout);
  }, [frame, loop, reducedMotion]);

  const displayedText = useMemo(() => {
    if (reducedMotion || (!loop && frame >= 20)) {
      return targetText;
    }

    return scramble(targetText, frame);
  }, [frame, loop, reducedMotion, targetText]);

  return (
    <span
      className="block whitespace-pre-wrap break-words text-center text-[clamp(30px,6vw,92px)] font-semibold leading-[1.08] text-black transition-[filter,opacity] duration-200"
      style={{
        filter: frame < 20 && !reducedMotion ? "blur(0.4px)" : "none",
        opacity: active && frame < 20 ? 0.72 : 1,
      }}
    >
      {displayedText}
    </span>
  );
}

export default function MatrixText({
  text,
  active,
  loop = false,
  animationKey,
}: {
  text: string;
  active: boolean;
  loop?: boolean;
  animationKey?: string | null;
}) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );

  return (
    <AnimatedMatrixText
      key={`${active ? "active" : "settle"}:${animationKey ?? text}`}
      active={active}
      loop={loop}
      reducedMotion={reducedMotion}
      text={text}
    />
  );
}
