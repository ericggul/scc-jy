export type Point = { readonly x: number; readonly y: number };

export type HypertextFragment = Point & {
  id: number;
  terms: readonly string[];
  phrase: string;
  attention: number;
  age: number;
  generation: number;
  revision: number;
};

export type HypertextLink = {
  id: number;
  source: number;
  target: number;
  strength: number;
  traffic: number;
  age: number;
};

export type Reader = {
  id: number;
  linkId: number;
  from: number;
  to: number;
  progress: number;
  speed: number;
};

export type HypertextNetwork = {
  fragments: HypertextFragment[];
  links: HypertextLink[];
  readers: Reader[];
  nextFragmentId: number;
  nextLinkId: number;
  randomState: number;
  time: number;
  nextStructuralChange: number;
};

export type HypertextEvents = {
  born: number;
  pruned: number;
  rewritten: number;
  crossings: number;
};

export type HypertextStep = {
  network: HypertextNetwork;
  events: HypertextEvents;
};

const INITIAL_TERMS = [
  ["index", "archive"],
  ["archive", "return"],
  ["return", "path"],
  ["path", "delay"],
  ["delay", "weather"],
  ["weather", "window"],
  ["window", "message"],
  ["message", "echo"],
  ["echo", "memory"],
  ["memory", "trace"],
  ["trace", "footnote"],
  ["footnote", "aside"],
  ["aside", "crossing"],
  ["crossing", "nearby"],
  ["nearby", "reader"],
  ["reader", "threshold"],
  ["threshold", "shelf"],
  ["shelf", "drift"],
  ["drift", "index"],
  ["margin", "unread"],
] as const;

const VOCABULARY = [
  "after",
  "archive",
  "aside",
  "crossing",
  "delay",
  "drift",
  "echo",
  "footnote",
  "index",
  "margin",
  "memory",
  "message",
  "nearby",
  "path",
  "reader",
  "return",
  "shelf",
  "threshold",
  "trace",
  "unread",
  "weather",
  "window",
] as const;

const EMPTY_EVENTS: HypertextEvents = {
  born: 0,
  pruned: 0,
  rewritten: 0,
  crossings: 0,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function nextRandom(state: number): [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned || 0x9e3779b9, unsigned / 0x100000000];
}

function randomIndex(value: number, length: number) {
  return Math.min(length - 1, Math.floor(value * length));
}

function relationKey(source: number, target: number) {
  return source < target ? `${source}:${target}` : `${target}:${source}`;
}

function phraseFor(terms: readonly string[], revision: number) {
  const [first = "page", second = "elsewhere", third] = terms;
  const forms = [
    `${first} keeps a place for ${second}.`,
    `${first} is read after ${second}.`,
    `from ${first}, return to ${second}.`,
    `${first} gathers near ${second}.`,
    `${second} leaves a trace in ${first}.`,
  ];
  const phrase = forms[revision % forms.length] ?? forms[0];
  return third ? phrase.replace(".", `, then ${third}.`) : phrase;
}

function similarity(
  first: HypertextFragment,
  second: HypertextFragment,
) {
  const shared = first.terms.filter((term) => second.terms.includes(term)).length;
  if (shared > 0) return Math.min(1, 0.35 + shared * 0.33);
  return 0.045;
}

function createFragment(
  id: number,
  x: number,
  y: number,
  terms: readonly string[],
  generation = 0,
  attention = 0.3,
): HypertextFragment {
  return {
    id,
    x,
    y,
    terms,
    phrase: phraseFor(terms, 0),
    attention,
    age: 0,
    generation,
    revision: 0,
  };
}

function addLink(
  links: readonly HypertextLink[],
  nextLinkId: number,
  source: number,
  target: number,
  strength: number,
) {
  const key = relationKey(source, target);
  if (source === target || links.some((link) => relationKey(link.source, link.target) === key)) {
    return { links: [...links], nextLinkId };
  }
  return {
    links: [
      ...links,
      {
        id: nextLinkId,
        source,
        target,
        strength,
        traffic: 0.12,
        age: 0,
      },
    ],
    nextLinkId: nextLinkId + 1,
  };
}

function positionFor(index: number, width: number, height: number) {
  const angle = index * 2.399963229728653;
  const radius = 0.2 + Math.sqrt(index / INITIAL_TERMS.length) * 0.3;
  return {
    x: width * 0.5 + Math.cos(angle) * width * radius,
    y: height * 0.5 + Math.sin(angle) * height * radius * 0.72,
  };
}

function findFragment(
  fragments: readonly HypertextFragment[],
  id: number,
) {
  return fragments.find((fragment) => fragment.id === id);
}

function linksFor(
  links: readonly HypertextLink[],
  fragmentId: number,
) {
  return links.filter(
    (link) => link.source === fragmentId || link.target === fragmentId,
  );
}

function otherEnd(link: HypertextLink, fragmentId: number) {
  return link.source === fragmentId ? link.target : link.source;
}

function chooseNextLink(
  links: readonly HypertextLink[],
  fragments: readonly HypertextFragment[],
  currentId: number,
  previousId: number,
  randomState: number,
) {
  const options = linksFor(links, currentId);
  if (options.length === 0) return { link: null, randomState };
  const current = findFragment(fragments, currentId);
  const weighted = options.map((link) => {
    const destination = findFragment(fragments, otherEnd(link, currentId));
    const semantic = current && destination ? similarity(current, destination) : 0;
    const returnPenalty = otherEnd(link, currentId) === previousId ? 0.34 : 1;
    return {
      link,
      weight: Math.max(0.01, (0.16 + link.strength + semantic) * returnPenalty),
    };
  });
  const total = weighted.reduce((sum, option) => sum + option.weight, 0);
  let value: number;
  [randomState, value] = nextRandom(randomState);
  let threshold = value * total;
  for (const option of weighted) {
    threshold -= option.weight;
    if (threshold <= 0) return { link: option.link, randomState };
  }
  return { link: weighted[weighted.length - 1]?.link ?? null, randomState };
}

function distance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function candidateTerms(
  fragments: readonly HypertextFragment[],
  point: Point,
  randomState: number,
) {
  const nearby = [...fragments]
    .sort((first, second) => distance(first, point) - distance(second, point))
    .slice(0, 3);
  const inherited = nearby.flatMap((fragment) => fragment.terms);
  let state = randomState;
  let value: number;
  [state, value] = nextRandom(state);
  const first = inherited[randomIndex(value, inherited.length)] ?? "margin";
  [state, value] = nextRandom(state);
  const second = VOCABULARY[randomIndex(value, VOCABULARY.length)] ?? "unread";
  return { terms: first === second ? [first, "trace"] : [first, second], randomState: state };
}

function birthPosition(
  parent: HypertextFragment,
  id: number,
  width: number,
  height: number,
) {
  const angle = id * 2.399963229728653;
  const radius = 46 + (id % 5) * 11;
  const margin = 38;
  return {
    x: clamp(parent.x + Math.cos(angle) * radius, margin, width - margin),
    y: clamp(parent.y + Math.sin(angle) * radius, margin, height - margin),
  };
}

function writeRevision(
  fragment: HypertextFragment,
  borrowedTerm: string,
) {
  const terms = [fragment.terms[1] ?? borrowedTerm, fragment.terms[0] ?? borrowedTerm, borrowedTerm]
    .filter((term, index, values) => values.indexOf(term) === index)
    .slice(0, 3);
  const revision = fragment.revision + 1;
  return {
    ...fragment,
    terms,
    phrase: phraseFor(terms, revision),
    attention: Math.max(fragment.attention, 0.44),
    revision,
  };
}

function structuralChange(
  network: HypertextNetwork,
  width: number,
  height: number,
) {
  let randomState = network.randomState;
  const selectionResult = nextRandom(randomState);
  randomState = selectionResult[0];
  const selection = selectionResult[1];
  const ordered = [...network.fragments].sort(
    (first, second) => second.attention - first.attention || first.id - second.id,
  );
  const parent = ordered[randomIndex(selection, ordered.length)] ?? network.fragments[0];
  if (!parent) return { network: { ...network, randomState }, events: EMPTY_EVENTS };

  const degree = linksFor(network.links, parent.id).length;
  const canBud =
    network.fragments.length < 34 &&
    parent.age > 1.8 &&
    parent.attention > 0.31 &&
    degree < 5;
  const decisionResult = nextRandom(randomState);
  randomState = decisionResult[0];
  const decision = decisionResult[1];

  if (canBud && decision < 0.36) {
    const termResult = candidateTerms(network.fragments, parent, randomState);
    randomState = termResult.randomState;
    const childId = network.nextFragmentId;
    const child = createFragment(
      childId,
      birthPosition(parent, childId, width, height).x,
      birthPosition(parent, childId, width, height).y,
      termResult.terms,
      parent.generation + 1,
      0.36,
    );
    let linkResult = addLink(
      network.links,
      network.nextLinkId,
      parent.id,
      child.id,
      0.56,
    );
    const companion = [...network.fragments]
      .filter((fragment) => fragment.id !== parent.id)
      .sort((first, second) => similarity(child, second) - similarity(child, first))[0];
    if (companion && similarity(child, companion) > 0.33) {
      linkResult = addLink(
        linkResult.links,
        linkResult.nextLinkId,
        child.id,
        companion.id,
        0.36,
      );
    }
    return {
      network: {
        ...network,
        fragments: [...network.fragments, child],
        links: linkResult.links,
        nextFragmentId: childId + 1,
        nextLinkId: linkResult.nextLinkId,
        randomState,
      },
      events: { ...EMPTY_EVENTS, born: 1 },
    };
  }

  const removable = network.links
    .filter((link) => {
      const sourceDegree = linksFor(network.links, link.source).length;
      const targetDegree = linksFor(network.links, link.target).length;
      return (
        link.age > 3 &&
        link.strength < 0.2 &&
        sourceDegree > 1 &&
        targetDegree > 1 &&
        !network.readers.some((reader) => reader.linkId === link.id)
      );
    })
    .sort((first, second) => first.strength - second.strength)[0];
  if (removable && decision < 0.62) {
    return {
      network: {
        ...network,
        links: network.links.filter((link) => link.id !== removable.id),
        readers: network.readers.filter((reader) => reader.linkId !== removable.id),
        randomState,
      },
      events: { ...EMPTY_EVENTS, pruned: 1 },
    };
  }

  const existing = new Set(
    network.links.map((link) => relationKey(link.source, link.target)),
  );
  const relation = network.fragments
    .flatMap((source, sourceIndex) =>
      network.fragments.slice(sourceIndex + 1).map((target) => ({
        source,
        target,
        affinity: similarity(source, target) *
          (0.45 + (source.attention + target.attention) * 0.42),
      })),
    )
    .filter((pair) => !existing.has(relationKey(pair.source.id, pair.target.id)))
    .sort((first, second) => second.affinity - first.affinity)[0];
  if (relation && relation.affinity > 0.29 && decision < 0.8) {
    const linkResult = addLink(
      network.links,
      network.nextLinkId,
      relation.source.id,
      relation.target.id,
      clamp(relation.affinity, 0.25, 0.66),
    );
    return {
      network: {
        ...network,
        links: linkResult.links,
        nextLinkId: linkResult.nextLinkId,
        randomState,
      },
      events: EMPTY_EVENTS,
    };
  }

  const neighbor = linksFor(network.links, parent.id)
    .map((link) => findFragment(network.fragments, otherEnd(link, parent.id)))
    .find((fragment): fragment is HypertextFragment => Boolean(fragment));
  if (neighbor) {
    return {
      network: {
        ...network,
        fragments: network.fragments.map((fragment) =>
          fragment.id === parent.id
            ? writeRevision(fragment, neighbor.terms[0] ?? "trace")
            : fragment,
        ),
        randomState,
      },
      events: { ...EMPTY_EVENTS, rewritten: 1 },
    };
  }

  return { network: { ...network, randomState }, events: EMPTY_EVENTS };
}

export function createHypertextNetwork(
  width: number,
  height: number,
  seed = 0x2e8b7853,
): HypertextNetwork {
  const fragments = INITIAL_TERMS.map((terms, index) => {
    const position = positionFor(index, width, height);
    return createFragment(index + 1, position.x, position.y, terms);
  });
  let links: HypertextLink[] = [];
  let nextLinkId = 1;
  for (let index = 0; index < fragments.length; index += 1) {
    const source = fragments[index];
    const target = fragments[(index + 1) % fragments.length];
    if (!source || !target) continue;
    const result = addLink(links, nextLinkId, source.id, target.id, 0.48);
    links = result.links;
    nextLinkId = result.nextLinkId;
  }
  for (const [sourceIndex, targetIndex] of [[0, 9], [3, 13], [6, 16], [11, 19]]) {
    const source = fragments[sourceIndex];
    const target = fragments[targetIndex];
    if (!source || !target) continue;
    const result = addLink(links, nextLinkId, source.id, target.id, 0.3);
    links = result.links;
    nextLinkId = result.nextLinkId;
  }
  let randomState = seed >>> 0 || 1;
  const readers: Reader[] = [];
  for (let index = 0; index < 13; index += 1) {
    let linkValue: number;
    let progress: number;
    let speed: number;
    [randomState, linkValue] = nextRandom(randomState);
    [randomState, progress] = nextRandom(randomState);
    [randomState, speed] = nextRandom(randomState);
    const link = links[randomIndex(linkValue, links.length)];
    if (!link) continue;
    readers.push({
      id: index + 1,
      linkId: link.id,
      from: link.source,
      to: link.target,
      progress,
      speed: 0.12 + speed * 0.19,
    });
  }
  return {
    fragments,
    links,
    readers,
    nextFragmentId: fragments.length + 1,
    nextLinkId,
    randomState,
    time: 0,
    nextStructuralChange: 0.72,
  };
}

export function resizeHypertextNetwork(
  network: HypertextNetwork,
  previous: { width: number; height: number },
  next: { width: number; height: number },
) {
  if (previous.width <= 0 || previous.height <= 0) return network;
  return {
    ...network,
    fragments: network.fragments.map((fragment) => ({
      ...fragment,
      x: fragment.x * (next.width / previous.width),
      y: fragment.y * (next.height / previous.height),
    })),
  };
}

export function stepHypertextNetwork(
  network: HypertextNetwork,
  width: number,
  height: number,
  deltaSeconds: number,
): HypertextStep {
  const delta = Math.min(0.05, Math.max(0, deltaSeconds));
  let randomState = network.randomState;
  const attention = new Map(network.fragments.map((fragment) => [
    fragment.id,
    Math.max(0.04, fragment.attention - delta * 0.055),
  ]));
  const traffic = new Map(network.links.map((link) => [
    link.id,
    Math.max(0, link.traffic - delta * 0.2),
  ]));
  let crossings = 0;
  const readers = network.readers.flatMap((reader) => {
    const link = network.links.find((candidate) => candidate.id === reader.linkId);
    if (!link) return [];
    const progress = reader.progress + delta * reader.speed;
    if (progress < 1) return [{ ...reader, progress }];
    crossings += 1;
    attention.set(reader.to, Math.min(1, (attention.get(reader.to) ?? 0) + 0.26));
    attention.set(reader.from, Math.min(1, (attention.get(reader.from) ?? 0) + 0.05));
    traffic.set(link.id, Math.min(1, (traffic.get(link.id) ?? 0) + 0.7));
    const next = chooseNextLink(
      network.links,
      network.fragments,
      reader.to,
      reader.from,
      randomState,
    );
    randomState = next.randomState;
    if (!next.link) return [];
    return [{
      ...reader,
      linkId: next.link.id,
      from: reader.to,
      to: otherEnd(next.link, reader.to),
      progress: progress - 1,
    }];
  });
  const fragments = network.fragments.map((fragment) => ({
    ...fragment,
    attention: attention.get(fragment.id) ?? fragment.attention,
    age: fragment.age + delta,
  }));
  const links = network.links.map((link) => {
    const source = findFragment(fragments, link.source);
    const target = findFragment(fragments, link.target);
    const semantic = source && target ? similarity(source, target) : 0;
    const nextTraffic = traffic.get(link.id) ?? link.traffic;
    return {
      ...link,
      traffic: nextTraffic,
      age: link.age + delta,
      strength: clamp(
        link.strength + (nextTraffic - 0.18) * delta * 0.42 + semantic * delta * 0.011,
        0.04,
        1,
      ),
    };
  });
  let evolving: HypertextNetwork = {
    ...network,
    fragments,
    links,
    readers,
    randomState,
    time: network.time + delta,
  };
  let events: HypertextEvents = { ...EMPTY_EVENTS, crossings };
  if (evolving.time >= evolving.nextStructuralChange) {
    const result = structuralChange(evolving, width, height);
    evolving = {
      ...result.network,
      nextStructuralChange: evolving.nextStructuralChange + 0.72,
    };
    events = {
      born: result.events.born,
      pruned: result.events.pruned,
      rewritten: result.events.rewritten,
      crossings,
    };
  }
  return { network: evolving, events };
}

export function seedHypertextFragment(
  network: HypertextNetwork,
  point: Point,
) {
  const termResult = candidateTerms(network.fragments, point, network.randomState);
  const id = network.nextFragmentId;
  const terms = [...termResult.terms, "unread"].filter(
    (term, index, values) => values.indexOf(term) === index,
  );
  const fragment = createFragment(id, point.x, point.y, terms, 0, 0.78);
  const neighbors = [...network.fragments]
    .sort((first, second) => distance(first, point) - distance(second, point))
    .slice(0, 2);
  let links = network.links;
  let nextLinkId = network.nextLinkId;
  for (const neighbor of neighbors) {
    const result = addLink(
      links,
      nextLinkId,
      fragment.id,
      neighbor.id,
      0.5 + similarity(fragment, neighbor) * 0.26,
    );
    links = result.links;
    nextLinkId = result.nextLinkId;
  }
  const firstLink = links.find(
    (link) => link.source === fragment.id || link.target === fragment.id,
  );
  const readers = firstLink
    ? [
      ...network.readers.slice(-27),
      {
        id: network.readers.reduce((maximum, reader) => Math.max(maximum, reader.id), 0) + 1,
        linkId: firstLink.id,
        from: fragment.id,
        to: otherEnd(firstLink, fragment.id),
        progress: 0,
        speed: 0.22,
      },
    ]
    : network.readers;
  return {
    ...network,
    fragments: [...network.fragments, fragment],
    links,
    readers,
    nextFragmentId: id + 1,
    nextLinkId,
    randomState: termResult.randomState,
  };
}
