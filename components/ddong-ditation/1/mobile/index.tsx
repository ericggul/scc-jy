"use client";

import { useEffect, useState } from "react";
import { useDdongDitationSocket } from "../transport/use-ddong-ditation-socket";
import HomePage from "./home-page";
import SessionPage from "./session-page";

const phaseCopy = {
  arriving: "몸의 무게를 변기에 맡겨보세요.",
  breathing: "천천히 숨을 들이쉬세요.",
  releasing: "배의 힘을 풀며 길게 내쉬세요.",
} as const;

type Phase = keyof typeof phaseCopy;

export default function DdongDitationMobile() {
  const {
    connected,
    connectionError,
    startSession,
    updateSession,
    completeSession,
  } = useDdongDitationSocket("mobile");
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<Phase>("arriving");
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    if (!active) return;

    const arrivalTimer = window.setTimeout(() => {
      setPhase("breathing");
      updateSession("breathing", 0);
    }, 2600);

    const breathTimer = window.setInterval(() => {
      setPhase((currentPhase) => {
        const nextPhase =
          currentPhase === "breathing" ? "releasing" : "breathing";
        setCycleCount((currentCount) => {
          const nextCount =
            nextPhase === "breathing" ? currentCount + 1 : currentCount;
          updateSession(nextPhase, nextCount);
          return nextCount;
        });
        return nextPhase;
      });
    }, 5200);

    return () => {
      window.clearTimeout(arrivalTimer);
      window.clearInterval(breathTimer);
    };
  }, [active, updateSession]);

  function begin() {
    setCycleCount(0);
    setPhase("arriving");
    setActive(true);
    startSession();
  }

  function finish() {
    completeSession();
    setActive(false);
  }

  if (active) {
    return (
      <SessionPage
        phase={phase}
        instruction={phaseCopy[phase]}
        cycleCount={cycleCount}
        onFinish={finish}
      />
    );
  }

  return (
    <HomePage
      connected={connected}
      connectionError={connectionError}
      onBegin={begin}
    />
  );
}
