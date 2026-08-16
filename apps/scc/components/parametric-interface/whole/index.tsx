"use client";

import { useCallback, useEffect, useState, type ComponentType, type MouseEvent } from "react";
import ParametricInterfaceOne from "../1";
import ParametricInterfaceTwo from "../2";
import ParametricInterfaceThree from "../3";
import ParametricInterfaceFour from "../4";
import ParametricInterfaceFive from "../5";
import ParametricInterfaceSix from "../6";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";

const wrapperCycle: readonly { id: string; Component: ComponentType }[] = [
  { id: "3", Component: ParametricInterfaceThree },
  { id: "4", Component: ParametricInterfaceFour },
  { id: "5", Component: ParametricInterfaceFive },
  { id: "6", Component: ParametricInterfaceSix },
  { id: "1", Component: ParametricInterfaceOne },
  { id: "2", Component: ParametricInterfaceTwo },
];

export default function ParametricInterfaceWhole({ song }: { song?: ParametricSong }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const ActiveWrapper = wrapperCycle[activeIndex]!.Component;

  const advanceWrapper = useCallback(() => {
    setActiveIndex((current) => (current + 1) % wrapperCycle.length);
  }, []);

  const chooseAnotherWrapper = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-parametric-play-control]")
    ) {
      return;
    }

    advanceWrapper();
  }, [advanceWrapper]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (
        event.target instanceof Element &&
        event.target.closest("[data-parametric-play-control]")
      ) {
        return;
      }
      if (
        event.code !== "Space" &&
        event.key !== "ArrowRight" &&
        event.key !== "Enter"
      ) {
        return;
      }

      event.preventDefault();
      advanceWrapper();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advanceWrapper]);

  return (
    <SongPlayback song={song}>
      <div onClickCapture={chooseAnotherWrapper}>
        <ActiveWrapper />
      </div>
    </SongPlayback>
  );
}
