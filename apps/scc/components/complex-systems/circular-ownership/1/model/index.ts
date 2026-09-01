export const sectorIds = [
  "finance",
  "core",
  "industry",
  "service",
  "commerce",
  "periphery",
] as const;

export type SectorId = (typeof sectorIds)[number];

export type CompanySeed = Readonly<{
  id: string;
  name: string;
  shortName: string;
  sector: SectorId;
}>;

/**
 * These are real domestic Samsung-affiliate names, used only as the material
 * for a deliberately fictional ownership circuit. The simulated links and
 * weights below are not a disclosure of present or historical holdings.
 */
const companySeeds = [
  { id: "life", name: "삼성생명", shortName: "생명", sector: "finance" },
  { id: "fire", name: "삼성화재", shortName: "화재", sector: "finance" },
  { id: "securities", name: "삼성증권", shortName: "증권", sector: "finance" },
  { id: "card", name: "삼성카드", shortName: "카드", sector: "finance" },
  { id: "asset-management", name: "삼성자산운용", shortName: "자산", sector: "finance" },
  { id: "active-asset", name: "삼성액티브자산운용", shortName: "액티브", sector: "finance" },
  { id: "sra-asset", name: "삼성SRA자산운용", shortName: "SRA", sector: "finance" },
  { id: "hedge-asset", name: "삼성헤지자산운용", shortName: "헤지", sector: "finance" },
  { id: "futures", name: "삼성선물", shortName: "선물", sector: "finance" },
  { id: "venture", name: "삼성벤처투자", shortName: "벤처", sector: "finance" },

  { id: "c-and-t", name: "삼성물산", shortName: "물산", sector: "core" },
  { id: "electronics", name: "삼성전자", shortName: "전자", sector: "core" },
  { id: "sdi", name: "삼성SDI", shortName: "SDI", sector: "core" },
  { id: "electro-mechanics", name: "삼성전기", shortName: "전기", sector: "core" },
  { id: "display", name: "삼성디스플레이", shortName: "디스플레이", sector: "core" },
  { id: "semes", name: "세메스", shortName: "세메스", sector: "core" },
  { id: "steco", name: "스테코", shortName: "스테코", sector: "core" },
  { id: "su-materials", name: "에스유머티리얼스", shortName: "SU", sector: "core" },
  { id: "corning", name: "삼성코닝어드밴스드글라스", shortName: "코닝", sector: "core" },

  { id: "e-and-a", name: "삼성E&A", shortName: "E&A", sector: "industry" },
  { id: "heavy", name: "삼성중공업", shortName: "중공업", sector: "industry" },
  { id: "biologics", name: "삼성바이오로직스", shortName: "바이오", sector: "industry" },
  { id: "bioepis", name: "삼성바이오에피스", shortName: "에피스", sector: "industry" },
  { id: "medison", name: "삼성메디슨", shortName: "메디슨", sector: "industry" },
  { id: "sd-flex", name: "SD플렉스", shortName: "SD", sector: "industry" },
  { id: "stm", name: "에스티엠", shortName: "STM", sector: "industry" },
  { id: "fn-reit", name: "삼성FN리츠", shortName: "FN", sector: "industry" },
  { id: "samwoo", name: "삼우종합건축사사무소", shortName: "삼우", sector: "industry" },

  { id: "sds", name: "삼성SDS", shortName: "SDS", sector: "service" },
  { id: "welstory", name: "삼성웰스토리", shortName: "웰스토리", sector: "service" },
  { id: "multicampus", name: "멀티캠퍼스", shortName: "멀티", sector: "service" },
  { id: "openhands", name: "오픈핸즈", shortName: "오픈", sector: "service" },
  { id: "s-core", name: "에스코어", shortName: "S-Core", sector: "service" },
  { id: "miracom", name: "미라콤", shortName: "미라콤", sector: "service" },
  { id: "global-research", name: "삼성글로벌리서치", shortName: "SGR", sector: "service" },
  { id: "human-tss", name: "휴먼티에스에스", shortName: "TSS", sector: "service" },
  { id: "s1", name: "에스원", shortName: "S1", sector: "service" },
  { id: "s1-crm", name: "에스원CRM", shortName: "CRM", sector: "service" },

  { id: "hotel-shilla", name: "호텔신라", shortName: "신라", sector: "commerce" },
  { id: "hdc-shilla", name: "HDC신라면세점", shortName: "HDC", sector: "commerce" },
  { id: "shilla-hm", name: "신라에이치엠", shortName: "HM", sector: "commerce" },
  { id: "cheil", name: "제일기획", shortName: "제일", sector: "commerce" },
  { id: "cheil-fashion", name: "제일패션리테일", shortName: "패션", sector: "commerce" },
  { id: "electronics-sales", name: "삼성전자판매", shortName: "판매", sector: "commerce" },
  { id: "electronics-service", name: "삼성전자서비스", shortName: "서비스", sector: "commerce" },
  { id: "service-cs", name: "삼성전자서비스CS", shortName: "CS", sector: "commerce" },
  { id: "card-cs", name: "삼성카드고객서비스", shortName: "카드CS", sector: "commerce" },
  { id: "electronics-logitech", name: "삼성전자 로지텍", shortName: "로지텍", sector: "commerce" },

  { id: "life-claim", name: "삼성생명서비스손해사정", shortName: "생명SA", sector: "periphery" },
  { id: "life-financial", name: "삼성생명금융서비스", shortName: "생명FS", sector: "periphery" },
  { id: "fire-service", name: "삼성화재서비스손해사정", shortName: "화재SA", sector: "periphery" },
  { id: "fire-claim", name: "삼성애니카손해사정", shortName: "애니카", sector: "periphery" },
  { id: "fire-financial", name: "삼성화재금융서비스", shortName: "화재FS", sector: "periphery" },
  { id: "bluewings", name: "수원삼성블루윙즈", shortName: "블루윙즈", sector: "periphery" },
  { id: "lions", name: "삼성라이온즈", shortName: "라이온즈", sector: "periphery" },
  { id: "sbtm", name: "SBTM", shortName: "SBTM", sector: "periphery" },
  { id: "lakeside", name: "서울레이크사이드", shortName: "레이크", sector: "periphery" },
  { id: "secui", name: "시큐아이", shortName: "시큐아이", sector: "periphery" },
  { id: "cvnet", name: "씨브이네트", shortName: "CVnet", sector: "periphery" },
  { id: "shp", name: "SHP", shortName: "SHP", sector: "periphery" },
  { id: "harman-korea", name: "하만인터내셔널코리아", shortName: "하만", sector: "periphery" },
  { id: "stellarforest", name: "스텔라포레스트", shortName: "스텔라", sector: "periphery" },
  { id: "mirero", name: "미레로시스템", shortName: "미레로", sector: "periphery" },
] as const satisfies readonly CompanySeed[];

export type CompanyId = (typeof companySeeds)[number]["id"];
export type Company = (typeof companySeeds)[number] & Readonly<{ position: Position }>;
export type Position = Readonly<{ x: number; y: number }>;

export const sectorLabels: Record<SectorId, string> = {
  finance: "금융",
  core: "전자·소재",
  industry: "건설·바이오",
  service: "서비스·연구",
  commerce: "유통·브랜드",
  periphery: "주변법인",
};

const sectorCenters: Record<SectorId, Position> = {
  finance: { x: 248, y: 186 },
  core: { x: 734, y: 160 },
  industry: { x: 1180, y: 205 },
  service: { x: 264, y: 632 },
  commerce: { x: 752, y: 660 },
  periphery: { x: 1184, y: 642 },
};

function layoutFor(seed: CompanySeed, index: number, count: number): Position {
  const center = sectorCenters[seed.sector];
  const row = Math.floor(index / 5);
  const column = index % 5;
  const columnsInRow = Math.min(5, count - row * 5);
  const compactColumn = column - (columnsInRow - 1) / 2;
  return {
    x: center.x + compactColumn * 88 + (row % 2) * 10,
    y: center.y + (row - Math.floor((count - 1) / 10)) * 50,
  };
}

export const companies: readonly Company[] = companySeeds.map((seed) => {
  const sectorMembers = companySeeds.filter((candidate) => candidate.sector === seed.sector);
  return {
    ...seed,
    position: layoutFor(seed, sectorMembers.indexOf(seed), sectorMembers.length),
  };
});

const companyById = new Map(companies.map((company) => [company.id, company]));

export function companyFor(id: CompanyId) {
  const company = companyById.get(id);
  if (!company) throw new Error(`Unknown company: ${id}`);
  return company;
}

export type Relation = Readonly<{
  id: string;
  owner: CompanyId;
  owned: CompanyId;
  baseline: number;
  latent: boolean;
  phase: number;
}>;

function edgeId(owner: CompanyId, owned: CompanyId) {
  return `${owner}--${owned}`;
}

function phaseOf(value: string) {
  return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 997, 17) / 997;
}

const sectorCircuits: readonly (readonly CompanyId[])[] = [
  ["life", "fire", "securities", "card", "asset-management", "active-asset", "sra-asset", "hedge-asset", "futures", "venture"],
  ["c-and-t", "electronics", "sdi", "electro-mechanics", "display", "semes", "steco", "su-materials", "corning"],
  ["e-and-a", "heavy", "biologics", "bioepis", "medison", "sd-flex", "stm", "fn-reit", "samwoo"],
  ["sds", "welstory", "multicampus", "openhands", "s-core", "miracom", "global-research", "human-tss", "s1", "s1-crm"],
  ["hotel-shilla", "hdc-shilla", "shilla-hm", "cheil", "cheil-fashion", "electronics-sales", "electronics-service", "service-cs", "card-cs", "electronics-logitech"],
  ["life-claim", "life-financial", "fire-service", "fire-claim", "fire-financial", "bluewings", "lions", "sbtm", "lakeside", "secui", "cvnet", "shp", "stellarforest", "mirero"],
];

const governanceCircuits: readonly (readonly CompanyId[])[] = [
  ["c-and-t", "life", "fire", "electronics", "electro-mechanics"],
  ["electronics", "sdi", "display", "semes"],
  ["c-and-t", "biologics", "bioepis", "medison"],
  ["life", "securities", "asset-management", "venture"],
  ["electronics", "sds", "global-research", "s-core"],
  ["c-and-t", "e-and-a", "heavy", "corning"],
  ["hotel-shilla", "cheil", "electronics-sales", "card"],
  ["fire", "fire-service", "s1", "electronics"],
];

const latentCouplings: readonly (readonly [CompanyId, CompanyId])[] = [
  ["venture", "biologics"], ["biologics", "life"], ["display", "sds"], ["sds", "electronics"],
  ["electro-mechanics", "e-and-a"], ["samwoo", "c-and-t"], ["asset-management", "fn-reit"], ["fn-reit", "life"],
  ["fire-financial", "securities"], ["securities", "fire"], ["welstory", "hotel-shilla"], ["hotel-shilla", "c-and-t"],
  ["electronics-sales", "electronics"], ["electronics", "electronics-service"], ["electronics-service", "s1"], ["s1", "electronics"],
  ["global-research", "multicampus"], ["multicampus", "sds"], ["miracom", "steco"], ["steco", "sds"],
  ["cheil", "lions"], ["lions", "card"], ["bluewings", "fire"], ["fire", "bluewings"],
  ["secui", "s1"], ["s1-crm", "secui"], ["cvnet", "service-cs"], ["service-cs", "card-cs"],
  ["sbtm", "heavy"], ["heavy", "sbtm"], ["shp", "cheil-fashion"], ["cheil-fashion", "shp"],
];

function createRelations() {
  const seen = new Set<string>();
  const relations: Relation[] = [];
  const add = (owner: CompanyId, owned: CompanyId, baseline: number, latent: boolean) => {
    const id = edgeId(owner, owned);
    if (owner === owned || seen.has(id)) return;
    seen.add(id);
    relations.push({ id, owner, owned, baseline, latent, phase: phaseOf(id) });
  };
  for (const circuit of sectorCircuits) {
    circuit.forEach((owner, index) => add(owner, circuit[(index + 1) % circuit.length]!, 0.024 + (index % 4) * 0.004, false));
  }
  for (const circuit of governanceCircuits) {
    circuit.forEach((owner, index) => add(owner, circuit[(index + 1) % circuit.length]!, 0.052 + (index % 3) * 0.008, false));
  }
  for (const [owner, owned] of latentCouplings) add(owner, owned, 0.002, true);
  return relations;
}

export const relations: readonly Relation[] = createRelations();
export type RelationId = (typeof relations)[number]["id"];

const relationById = new Map(relations.map((relation) => [relation.id, relation]));

export function relationFor(id: RelationId) {
  const relation = relationById.get(id);
  if (!relation) throw new Error(`Unknown simulated relation: ${id}`);
  return relation;
}

export const ACTIVE_THRESHOLD = 0.014;

export type SimulationState = Readonly<{
  time: number;
  capacities: Record<CompanyId, number>;
  stakes: Record<RelationId, number>;
}>;

function bounded(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function average(values: readonly number[]) {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

export function createSimulationState(): SimulationState {
  return {
    time: 0,
    capacities: Object.fromEntries(companies.map((company) => [
      company.id,
      0.48 + phaseOf(company.id) * 0.2,
    ])) as Record<CompanyId, number>,
    stakes: Object.fromEntries(relations.map((relation) => [
      relation.id,
      relation.baseline + (relation.latent ? 0 : 0.004 * Math.sin(relation.phase * Math.PI * 2)),
    ])) as Record<RelationId, number>,
  };
}

function returnConductance(
  stakes: Readonly<Record<RelationId, number>>,
  start: CompanyId,
  target: CompanyId,
) {
  let frontier = new Map<CompanyId, number>([[start, 1]]);
  let returned = 0;
  for (let depth = 0; depth < 5; depth += 1) {
    const next = new Map<CompanyId, number>();
    for (const relation of relations) {
      const sourceScore = frontier.get(relation.owner);
      const weight = stakes[relation.id] ?? 0;
      if (!sourceScore || weight < ACTIVE_THRESHOLD * 0.68) continue;
      const transported = sourceScore * bounded(weight * 8.5, 0, 0.82);
      if (relation.owned === target) returned += transported;
      next.set(relation.owned, Math.max(next.get(relation.owned) ?? 0, transported));
    }
    frontier = next;
  }
  return bounded(returned, 0, 1);
}

function inboundPotential(
  stakes: Readonly<Record<RelationId, number>>,
  capacities: Readonly<Record<CompanyId, number>>,
  owned: CompanyId,
) {
  return relations
    .filter((relation) => relation.owned === owned)
    .reduce((total, relation) => total + (stakes[relation.id] ?? 0) * (capacities[relation.owner] ?? 0), 0);
}

/**
 * A bounded, deterministic nonlinear update of the virtual ownership matrix.
 * `pressure` changes the strength of return-path reinforcement; no records,
 * dates, prices, or historical share percentages enter this equation.
 */
export function advanceSimulation(
  state: SimulationState,
  pressure: number,
  elapsedSeconds: number,
): SimulationState {
  const step = bounded(elapsedSeconds, 0.001, 0.055);
  const loopPressure = bounded(pressure, 0, 1);
  const nextTime = state.time + step;
  const capacities = Object.fromEntries(companies.map((company) => {
    const inbound = inboundPotential(state.stakes, state.capacities, company.id);
    const phase = phaseOf(company.id) * Math.PI * 2;
    const pulse = 0.055 * Math.sin(nextTime * (0.53 + phaseOf(company.id) * 0.21) + phase);
    const desired = bounded(0.42 + inbound * 2.1 + pulse, 0.24, 0.94);
    const present = state.capacities[company.id] ?? desired;
    return [company.id, bounded(present + (desired - present) * step * 1.1, 0.2, 1)] as const;
  })) as Record<CompanyId, number>;

  const stakes = Object.fromEntries(relations.map((relation) => {
    const returnPath = returnConductance(state.stakes, relation.owned, relation.owner);
    const ownerPotential = capacities[relation.owner] ?? 0;
    const ownedPotential = capacities[relation.owned] ?? 0;
    const carrier = 0.5 + 0.5 * Math.sin(nextTime * (0.62 + relation.phase * 0.35) + relation.phase * Math.PI * 2);
    const pulse = relation.latent ? carrier * 0.024 : carrier * 0.007;
    const base = relation.latent ? 0.0015 : relation.baseline;
    const desired = bounded(
      base
        + pulse * (0.3 + loopPressure * 0.9)
        + returnPath * (0.012 + loopPressure * 0.082)
        + (ownerPotential * ownedPotential) * (relation.latent ? 0.004 : 0.009),
      0,
      relation.latent ? 0.092 : 0.148,
    );
    const present = state.stakes[relation.id] ?? base;
    const response = relation.latent ? 1.15 : 0.72;
    return [relation.id, bounded(present + (desired - present) * step * response, 0, 0.16)] as const;
  })) as Record<RelationId, number>;

  return { time: nextTime, capacities, stakes };
}

export function injectCirculation(state: SimulationState, companyId: CompanyId): SimulationState {
  return {
    ...state,
    capacities: {
      ...state.capacities,
      [companyId]: bounded((state.capacities[companyId] ?? 0.5) + 0.24, 0.2, 1),
    },
  };
}

function activeRelations(state: SimulationState) {
  return relations.filter((relation) => (state.stakes[relation.id] ?? 0) >= ACTIVE_THRESHOLD);
}

/** Tarjan SCCs on the currently visible virtual stakes. */
export function stronglyConnectedGroups(state: SimulationState) {
  const outgoing = new Map<CompanyId, CompanyId[]>(companies.map((company) => [company.id, []]));
  for (const relation of activeRelations(state)) outgoing.get(relation.owner)?.push(relation.owned);
  const indexes = new Map<CompanyId, number>();
  const lowLinks = new Map<CompanyId, number>();
  const stack: CompanyId[] = [];
  const onStack = new Set<CompanyId>();
  const groups: CompanyId[][] = [];
  let index = 0;
  const visit = (id: CompanyId) => {
    indexes.set(id, index);
    lowLinks.set(id, index);
    index += 1;
    stack.push(id);
    onStack.add(id);
    for (const next of outgoing.get(id) ?? []) {
      if (!indexes.has(next)) {
        visit(next);
        lowLinks.set(id, Math.min(lowLinks.get(id)!, lowLinks.get(next)!));
      } else if (onStack.has(next)) {
        lowLinks.set(id, Math.min(lowLinks.get(id)!, indexes.get(next)!));
      }
    }
    if (lowLinks.get(id) !== indexes.get(id)) return;
    const group: CompanyId[] = [];
    let member: CompanyId | undefined;
    do {
      member = stack.pop();
      if (!member) break;
      onStack.delete(member);
      group.push(member);
    } while (member !== id);
    if (group.length > 1) groups.push(group);
  };
  for (const company of companies) if (!indexes.has(company.id)) visit(company.id);
  return groups.sort((left, right) => right.length - left.length);
}

export type SimulationAnalysis = Readonly<{
  activeRelationIds: ReadonlySet<RelationId>;
  recurrentRelationIds: ReadonlySet<RelationId>;
  cycleStrengths: Readonly<Record<RelationId, number>>;
  groups: readonly (readonly CompanyId[])[];
}>;

export function analyseSimulation(state: SimulationState): SimulationAnalysis {
  const groups = stronglyConnectedGroups(state);
  const groupForCompany = new Map<CompanyId, number>();
  groups.forEach((group, index) => group.forEach((companyId) => groupForCompany.set(companyId, index)));
  const activeRelationIds = new Set<RelationId>();
  const recurrentRelationIds = new Set<RelationId>();
  const cycleStrengths = {} as Record<RelationId, number>;
  for (const relation of relations) {
    const value = state.stakes[relation.id] ?? 0;
    if (value >= ACTIVE_THRESHOLD) activeRelationIds.add(relation.id);
    const strength = returnConductance(state.stakes, relation.owned, relation.owner);
    cycleStrengths[relation.id] = strength;
    if (
      value >= ACTIVE_THRESHOLD
      && strength > 0.008
      && groupForCompany.get(relation.owner) !== undefined
      && groupForCompany.get(relation.owner) === groupForCompany.get(relation.owned)
    ) recurrentRelationIds.add(relation.id);
  }
  return { activeRelationIds, recurrentRelationIds, cycleStrengths, groups };
}

export function simulationMetrics(state: SimulationState, analysis = analyseSimulation(state)) {
  const activeValues = relations
    .map((relation) => state.stakes[relation.id] ?? 0)
    .filter((value) => value >= ACTIVE_THRESHOLD);
  return {
    activeRelations: activeValues.length,
    recurrentRelations: analysis.recurrentRelationIds.size,
    meanStake: average(activeValues),
    largestLoop: analysis.groups[0]?.length ?? 0,
  };
}
