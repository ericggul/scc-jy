export type SocialMember = {
  id: string;
  kind: "person" | "account";
  x: number;
  y: number;
  activity: number;
  attention: number;
};

export type SocialRelation = {
  id: string;
  source: string;
  target: string;
  kind: "conversation" | "follow";
  trust: number;
  signal: number;
};

export type SocialNetwork = {
  members: SocialMember[];
  relations: SocialRelation[];
  tick: number;
  nextMember: number;
  nextRelation: number;
};

const INITIAL_MEMBERS = 13;

function clamp(value: number, low = 0, high = 1) {
  return Math.min(high, Math.max(low, value));
}

function unit(value: number) {
  return value - Math.floor(value);
}

function sample(seed: number) {
  return unit(Math.sin(seed * 91.371) * 48127.313);
}

function relationKey(source: string, target: string) {
  return [source, target].sort().join(":");
}

function distance(a: SocialMember, b: SocialMember) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function makeMember(id: number, x?: number, y?: number): SocialMember {
  return {
    id: `member-${id}`,
    kind: id % 5 === 0 ? "account" : "person",
    x: x ?? 0.09 + sample(id * 7) * 0.82,
    y: y ?? 0.12 + sample(id * 13) * 0.76,
    activity: 0.25 + sample(id * 19) * 0.52,
    attention: 0.3 + sample(id * 23) * 0.55,
  };
}

function makeRelation(
  id: number,
  source: string,
  target: string,
  kind: SocialRelation["kind"],
  trust = 0.3,
): SocialRelation {
  return { id: `relation-${id}`, source, target, kind, trust, signal: 0 };
}

export function createSocialNetwork(): SocialNetwork {
  const members = Array.from({ length: INITIAL_MEMBERS }, (_, index) =>
    makeMember(index + 1),
  );
  const pairs: Array<[SocialMember, SocialMember]> = [];
  const keys = new Set<string>();

  for (const member of members) {
    const nearby = members
      .filter((candidate) => candidate.id !== member.id)
      .sort((a, b) => distance(member, a) - distance(member, b))
      .slice(0, 2);
    for (const other of nearby) {
      const key = relationKey(member.id, other.id);
      if (keys.has(key)) continue;
      keys.add(key);
      pairs.push([member, other]);
    }
  }

  return {
    members,
    relations: pairs.map(([source, target], index) =>
      makeRelation(
        index + 1,
        source.id,
        target.id,
        index % 3 === 0 ? "follow" : "conversation",
        0.32 + sample(index + 1) * 0.38,
      ),
    ),
    tick: 0,
    nextMember: INITIAL_MEMBERS + 1,
    nextRelation: pairs.length + 1,
  };
}

export function addSocialMember(network: SocialNetwork, x?: number, y?: number) {
  const member = makeMember(network.nextMember, x, y);
  const neighbour = network.members
    .slice()
    .sort((a, b) => distance(member, a) - distance(member, b))[0];
  const relations = neighbour
    ? [
        ...network.relations,
        makeRelation(
          network.nextRelation,
          member.id,
          neighbour.id,
          "conversation",
          0.42,
        ),
      ]
    : network.relations;

  return {
    ...network,
    members: [...network.members, member],
    relations,
    nextMember: network.nextMember + 1,
    nextRelation: neighbour ? network.nextRelation + 1 : network.nextRelation,
  };
}

export function removeSocialMember(network: SocialNetwork) {
  if (network.members.length <= 5) return network;
  const member = network.members
    .slice()
    .sort((a, b) => a.activity + a.attention - (b.activity + b.attention))[0];
  return {
    ...network,
    members: network.members.filter((candidate) => candidate.id !== member.id),
    relations: network.relations.filter(
      (relation) => relation.source !== member.id && relation.target !== member.id,
    ),
  };
}

export function promptConversation(
  network: SocialNetwork,
  sourceId?: string,
): SocialNetwork {
  const source = sourceId
    ? network.members.find((member) => member.id === sourceId)
    : network.members
        .slice()
        .sort((a, b) => b.activity + b.attention - (a.activity + a.attention))[0];
  if (!source) return network;

  const target = network.members
    .filter((member) => member.id !== source.id)
    .sort((a, b) => distance(source, a) - distance(source, b))[0];
  if (!target) return network;

  const existing = network.relations.find(
    (relation) => relationKey(relation.source, relation.target) === relationKey(source.id, target.id),
  );
  if (existing) {
    return {
      ...network,
      relations: network.relations.map((relation) =>
        relation.id === existing.id
          ? { ...relation, kind: "conversation", trust: clamp(relation.trust + 0.27), signal: 1 }
          : relation,
      ),
    };
  }

  return {
    ...network,
    relations: [
      ...network.relations,
      makeRelation(network.nextRelation, source.id, target.id, "conversation", 0.48),
    ],
    nextRelation: network.nextRelation + 1,
  };
}

export function dissolveSocialRelation(network: SocialNetwork) {
  if (network.relations.length === 0) return network;
  const relation = network.relations
    .slice()
    .sort((a, b) => a.trust - b.trust)[0];
  return {
    ...network,
    relations: network.relations.filter((candidate) => candidate.id !== relation.id),
  };
}

export function stepSocialNetwork(network: SocialNetwork, deltaSeconds: number): SocialNetwork {
  const tick = network.tick + 1;
  const degree = new Map<string, number>();
  for (const relation of network.relations) {
    degree.set(relation.source, (degree.get(relation.source) ?? 0) + 1);
    degree.set(relation.target, (degree.get(relation.target) ?? 0) + 1);
  }

  const members = network.members.map((member) => {
    const localDegree = degree.get(member.id) ?? 0;
    const attention = clamp(
      member.attention +
        (sample(tick * 0.17 + member.id.length * 3) - 0.5) * deltaSeconds * 0.72 +
        Math.min(localDegree, 5) * deltaSeconds * 0.025,
    );
    return {
      ...member,
      attention,
      activity: clamp(member.activity + (attention - member.activity) * deltaSeconds * 0.95),
    };
  });
  const memberById = new Map(members.map((member) => [member.id, member]));
  const retained = network.relations
    .map((relation) => {
      const source = memberById.get(relation.source);
      const target = memberById.get(relation.target);
      if (!source || !target) return null;
      const exchange = (source.activity + target.activity) * 0.5;
      const trust = clamp(
        relation.trust + (exchange - 0.43) * deltaSeconds * 0.14 - deltaSeconds * 0.008,
      );
      return {
        ...relation,
        trust,
        signal: relation.kind === "conversation" ? Math.max(0, relation.signal - deltaSeconds * 0.68) : 0,
      };
    })
    .filter((relation): relation is SocialRelation => relation !== null && relation.trust > 0.08);
  const existing = new Set(retained.map((relation) => relationKey(relation.source, relation.target)));
  const additions: SocialRelation[] = [];
  let nextRelation = network.nextRelation;

  for (const member of members) {
    if (degree.get(member.id) !== 0 && sample(tick * 11 + member.id.length * 37) > 0.024) continue;
    const target = members
      .filter(
        (candidate) =>
          candidate.id !== member.id &&
          !existing.has(relationKey(member.id, candidate.id)) &&
          distance(member, candidate) < 0.29,
      )
      .sort((a, b) => distance(member, a) - distance(member, b))[0];
    if (!target) continue;
    const key = relationKey(member.id, target.id);
    existing.add(key);
    additions.push(
      makeRelation(
        nextRelation,
        member.id,
        target.id,
        sample(tick + nextRelation) > 0.65 ? "follow" : "conversation",
        0.24,
      ),
    );
    nextRelation += 1;
  }

  return { ...network, members, relations: [...retained, ...additions], tick, nextRelation };
}
