"use client";

import { useEffect, useRef } from "react";
import styled from "styled-components";
import type { CValSnapshot } from "@/components/c-val/2/model";
import { RollercoasterScene } from "./scene";

const Stage = styled.main`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #aeb8ba;
`;

const Mount = styled.div`
  position: absolute;
  inset: 0;

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
`;

export default function CValRollercoasterScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RollercoasterScene | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new RollercoasterScene(mount);
    sceneRef.current = scene;
    return () => {
      sceneRef.current = null;
      scene.dispose();
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setSnapshot(snapshot);
  }, [snapshot]);

  const price = Number.isFinite(snapshot.market.index) ? snapshot.market.index : 100;
  const change = Number.isFinite(snapshot.market.changeFromOpenPercent)
    ? snapshot.market.changeFromOpenPercent
    : 0;

  return (
    <Stage>
      <Mount
        ref={mountRef}
        role="img"
        aria-label={`짧은 실행가격 이력이 실제 레일이 되는 주식시장 롤러코스터. 현재 ${price.toFixed(2)}, 시가 대비 ${change >= 0 ? "상승" : "하락"} ${Math.abs(change).toFixed(2)}퍼센트`}
      />
    </Stage>
  );
}
