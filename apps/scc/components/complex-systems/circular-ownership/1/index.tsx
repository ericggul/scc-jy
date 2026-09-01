"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./circular-ownership.module.css";
import {
  ACTIVE_THRESHOLD,
  analyseSimulation,
  advanceSimulation,
  companies,
  companyFor,
  createSimulationState,
  injectCirculation,
  relationFor,
  relations,
  sectorIds,
  sectorLabels,
  simulationMetrics,
  type CompanyId,
  type Relation,
  type RelationId,
} from "./model";

const VIEW_WIDTH = 1440;
const VIEW_HEIGHT = 840;

type Curve = Readonly<{ path: string; label: { x: number; y: number } }>;

function labelWidth(name: string) {
  return Math.max(54, Math.min(116, 19 + [...name].length * 10));
}

function curveFor(relation: Relation): Curve {
  const from = companyFor(relation.owner).position;
  const to = companyFor(relation.owned).position;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / distance;
  const unitY = dy / distance;
  const normalX = -unitY;
  const normalY = unitX;
  const bendDirection = relation.phase > 0.5 ? 1 : -1;
  const bend = Math.min(76, distance * 0.13) * bendDirection;
  const start = {
    x: from.x + unitX * (labelWidth(companyFor(relation.owner).name) * 0.31),
    y: from.y + unitY * 12,
  };
  const end = {
    x: to.x - unitX * (labelWidth(companyFor(relation.owned).name) * 0.31),
    y: to.y - unitY * 12,
  };
  const control = {
    x: (start.x + end.x) / 2 + normalX * bend,
    y: (start.y + end.y) / 2 + normalY * bend,
  };
  return {
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    label: {
      x: start.x * 0.25 + control.x * 0.5 + end.x * 0.25,
      y: start.y * 0.25 + control.y * 0.5 + end.y * 0.25,
    },
  };
}

function stakeText(value: number) {
  return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
}

function sectorPosition(sector: (typeof sectorIds)[number]) {
  const sectorCompanies = companies.filter((company) => company.sector === sector);
  return {
    x: Math.min(...sectorCompanies.map((company) => company.position.x)) - 54,
    y: Math.min(...sectorCompanies.map((company) => company.position.y)) - 34,
  };
}

export default function CircularOwnershipOne() {
  const [simulation, setSimulation] = useState(() => createSimulationState());
  const simulationRef = useRef(simulation);
  const [pressure, setPressure] = useState(0.62);
  const pressureRef = useRef(pressure);
  const [selectedRelationId, setSelectedRelationId] = useState<RelationId | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<CompanyId>("c-and-t");
  const analysis = useMemo(() => analyseSimulation(simulation), [simulation]);
  const metrics = useMemo(() => simulationMetrics(simulation, analysis), [simulation, analysis]);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return undefined;
    let animationFrame = 0;
    let lastFrame = 0;
    let lastCommit = 0;
    const tick = (now: number) => {
      const elapsed = lastFrame === 0 ? 0.025 : Math.min(0.055, (now - lastFrame) / 1000);
      lastFrame = now;
      simulationRef.current = advanceSimulation(simulationRef.current, pressureRef.current, elapsed);
      if (now - lastCommit > 34) {
        lastCommit = now;
        setSimulation(simulationRef.current);
      }
      animationFrame = window.requestAnimationFrame(tick);
    };
    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  const updatePressure = (value: number) => {
    const nextPressure = Math.max(0, Math.min(1, value));
    pressureRef.current = nextPressure;
    setPressure(nextPressure);
  };

  const inject = useCallback((companyId: CompanyId) => {
    const next = injectCirculation(simulationRef.current, companyId);
    simulationRef.current = next;
    setSelectedCompanyId(companyId);
    setSelectedRelationId(null);
    setSimulation(next);
  }, []);

  const reset = () => {
    const next = createSimulationState();
    simulationRef.current = next;
    setSelectedRelationId(null);
    setSelectedCompanyId("c-and-t");
    setSimulation(next);
  };

  const selectedRelation = selectedRelationId ? relationFor(selectedRelationId) : null;
  const selectedStake = selectedRelation ? simulation.stakes[selectedRelation.id] ?? 0 : 0;
  const selectedCompany = companyFor(selectedCompanyId);
  const recurrentCompanies = new Set(analysis.groups.flat());

  return (
    <main className={styles.field}>
      <header className={styles.header}>
        <h1>circular-ownership/1</h1>
        <div className={styles.pressureControl}>
          <label htmlFor="ownership-pressure">순환 압력</label>
          <input
            id="ownership-pressure"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={pressure}
            onChange={(event) => updatePressure(Number(event.target.value))}
          />
          <output>{Math.round(pressure * 100)}</output>
          <button type="button" onClick={reset}>초기화</button>
        </div>
      </header>

      <section className={styles.stage} aria-label="63개 삼성 계열사 명단을 재료로 한 가상 순환출자 동역학">
        <svg className={styles.graph} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-labelledby="ownership-title ownership-description">
          <title id="ownership-title">가상 삼성 계열사 순환출자 동역학</title>
          <desc id="ownership-description">
            삼성 계열사 명단을 노드로 사용하는 가상 순환출자 회로다. 선의 두께는 시뮬레이션된 직접 보유 강도이며, 붉은 선은 현재 귀환 경로를 갖는다. 회사를 누르면 그 회사의 순환 잠재량이 일시적으로 증가한다.
          </desc>
          <defs>
            <marker id="ownership-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M 0 0 L 7.5 4 L 0 8 z" fill="currentColor" />
            </marker>
          </defs>

          {sectorIds.map((sector) => {
            const position = sectorPosition(sector);
            return <text key={sector} className={styles.sectorLabel} x={position.x} y={position.y}>{sectorLabels[sector]}</text>;
          })}

          {relations.map((relation) => {
            const stake = simulation.stakes[relation.id] ?? 0;
            if (stake < ACTIVE_THRESHOLD) return null;
            const geometry = curveFor(relation);
            const isSelected = relation.id === selectedRelationId;
            const isRecurrent = analysis.recurrentRelationIds.has(relation.id);
            const strongReturn = analysis.cycleStrengths[relation.id] ?? 0;
            const className = [
              styles.relation,
              relation.latent ? styles.latentRelation : "",
              isRecurrent ? styles.recurrentRelation : "",
              isSelected ? styles.selectedRelation : "",
            ].filter(Boolean).join(" ");
            return (
              <g key={relation.id} className={styles.relationGroup} style={{ color: isSelected ? "#c06e28" : isRecurrent ? "#a83332" : "#34506e" }}>
                <path
                  className={styles.relationHit}
                  d={geometry.path}
                  strokeWidth={24}
                  role="button"
                  tabIndex={0}
                  aria-label={`${companyFor(relation.owner).name}에서 ${companyFor(relation.owned).name}으로 가상 보유 ${stakeText(stake)}`}
                  onClick={() => {
                    setSelectedRelationId(relation.id);
                    setSelectedCompanyId(relation.owner);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedRelationId(relation.id);
                      setSelectedCompanyId(relation.owner);
                    }
                  }}
                />
                <path
                  className={className}
                  d={geometry.path}
                  markerEnd="url(#ownership-arrow)"
                  strokeWidth={0.8 + stake * 23 + strongReturn * 2.4}
                />
              </g>
            );
          })}

          {companies.map((company) => {
            const potential = simulation.capacities[company.id] ?? 0;
            const width = labelWidth(company.name);
            const isSelected = company.id === selectedCompanyId;
            const isRecurrent = recurrentCompanies.has(company.id);
            return (
              <g
                key={company.id}
                className={[styles.company, isSelected ? styles.selectedCompany : "", isRecurrent ? styles.recurrentCompany : ""].filter(Boolean).join(" ")}
                transform={`translate(${company.position.x - width / 2} ${company.position.y - 12})`}
                role="button"
                tabIndex={0}
                aria-label={`${company.name}. 순환 잠재량 ${Math.round(potential * 100)}. 누르면 순환 잠재량을 주입합니다.`}
                onClick={() => inject(company.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    inject(company.id);
                  }
                }}
              >
                <rect className={styles.companyPlate} width={width} height="24" style={{ opacity: 0.58 + potential * 0.37 }} />
                <line className={styles.companyStem} x1="7" x2={width - 7} y1="4" y2="4" />
                <text className={styles.companyName} x={width / 2} y="17" textAnchor="middle">{company.shortName}</text>
              </g>
            );
          })}
        </svg>
      </section>

      <footer className={styles.footer}>
        <output className={styles.readout} aria-live="polite">
          {selectedRelation
            ? <>{companyFor(selectedRelation.owner).name} → {companyFor(selectedRelation.owned).name} <b>{stakeText(selectedStake)}</b> 가상 보유</>
            : <>{selectedCompany.name}에 순환 잠재량 주입</>}
        </output>
        <p className={styles.state}>
          {metrics.activeRelations}개 직접관계 · {metrics.recurrentRelations}개 귀환관계 · 최대 {metrics.largestLoop}개 법인 회로
        </p>
      </footer>
    </main>
  );
}
