export type TerminalLine = {
  id: string;
  kind: "command" | "response";
  text: string;
};

export type ActiveCommand = {
  text: string;
  response: string;
  startedAt: number;
  duration: number;
};

export type TerminalAgent = {
  id: string;
  parentId: string | null;
  generation: number;
  phase: number;
  attention: number;
  nextDecisionAt: number;
  offspring: number;
  peers: string[];
  seenSignals: string[];
  lines: TerminalLine[];
  nextLine: number;
  active: ActiveCommand | null;
  openedAt: number;
};

export type DirectedSignal = {
  id: string;
  from: string;
  to: string;
  token: string;
  expiresAt: number;
};

export type SharedFragment = {
  id: string;
  token: string;
  expiresAt: number;
};

export type TerminalColony = {
  agents: TerminalAgent[];
  signals: DirectedSignal[];
  fragments: SharedFragment[];
  time: number;
  nextFragment: number;
};

const MAX_LINES = 6;
const MAX_OFFSPRING = 1;
const MAX_GENERATION = 2;
const TOKENS = ["thread", "grain", "echo", "rift", "moss", "ember"];

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function sample(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function agentId(index: number) {
  return `agent/${String(index).padStart(2, "0")}`;
}

function makeAgent(
  id: string,
  time: number,
  parentId: string | null,
  generation: number,
  peers: string[],
): TerminalAgent {
  const seed = [...id].reduce((total, character) => total + character.charCodeAt(0), 0);
  return {
    id,
    parentId,
    generation,
    phase: sample(seed * 31 + generation * 17),
    attention: 0.36 + sample(seed * 43) * 0.44,
    nextDecisionAt: time + 0.28 + sample(seed * 29) * 1.4,
    offspring: 0,
    peers,
    seenSignals: [],
    lines: parentId
      ? [
          { id: `${id}:0`, kind: "command", text: `boot --from ${parentId}` },
          { id: `${id}:1`, kind: "response", text: "local shell ready" },
        ]
      : [
          { id: `${id}:0`, kind: "command", text: "open --local" },
          { id: `${id}:1`, kind: "response", text: "waiting for a nearby trace" },
        ],
    nextLine: 2,
    active: null,
    openedAt: time,
  };
}

function addLine(
  agent: TerminalAgent,
  kind: TerminalLine["kind"],
  text: string,
): TerminalAgent {
  const line = { id: `${agent.id}:${agent.nextLine}`, kind, text };
  return {
    ...agent,
    lines: [...agent.lines, line].slice(-MAX_LINES),
    nextLine: agent.nextLine + 1,
  };
}

function startCommand(
  agent: TerminalAgent,
  time: number,
  text: string,
  response: string,
): TerminalAgent {
  return {
    ...agent,
    active: {
      text,
      response,
      startedAt: time,
      duration: 0.48 + text.length * 0.016,
    },
    nextDecisionAt: time + 1.1 + sample(agent.phase * 31 + time * 1.9) * 1.7,
  };
}

function settleCommand(agent: TerminalAgent, time: number) {
  if (!agent.active || time < agent.active.startedAt + agent.active.duration) {
    return agent;
  }
  return addLine(
    addLine(agent, "command", agent.active.text),
    "response",
    agent.active.response,
  );
}

function tokenFor(seed: number) {
  return TOKENS[Math.floor(sample(seed) * TOKENS.length)] ?? TOKENS[0];
}

export function createTerminalColony(): TerminalColony {
  const agents = [
    makeAgent(agentId(1), 0, null, 0, [agentId(2), agentId(3)]),
    makeAgent(agentId(2), 0, null, 0, [agentId(1), agentId(4)]),
    makeAgent(agentId(3), 0, null, 0, [agentId(1), agentId(5)]),
    makeAgent(agentId(4), 0, null, 0, [agentId(2), agentId(5)]),
    makeAgent(agentId(5), 0, null, 0, [agentId(3), agentId(4)]),
  ];
  return {
    agents,
    signals: [],
    fragments: [],
    time: 0,
    nextFragment: 1,
  };
}

type AgentDecision = {
  agent: TerminalAgent;
  signal: DirectedSignal | null;
  child: TerminalAgent | null;
};

function decideForAgent(
  agent: TerminalAgent,
  colony: TerminalColony,
  time: number,
): AgentDecision {
  const received = colony.signals.find(
    (signal) => signal.to === agent.id && !agent.seenSignals.includes(signal.id),
  );
  const fragment = colony.fragments[0];
  const impulse = sample(agent.phase * 71 + time * 2.17 + agent.nextLine);

  if (received) {
    const listening = startCommand(
      {
        ...agent,
        attention: clamp(agent.attention + 0.19),
        seenSignals: [...agent.seenSignals, received.id].slice(-12),
      },
      time,
      `listen --from ${received.from}`,
      `received “${received.token}”`,
    );
    return {
      agent: listening,
      signal: null,
      child: null,
    };
  }

  if (
    fragment &&
    impulse > 0.44 &&
    agent.attention > 0.39
  ) {
    return {
      agent: startCommand(
        { ...agent, attention: clamp(agent.attention + 0.08) },
        time,
        `inspect --fragment ${fragment.token}`,
        `kept “${fragment.token}” in local memory`,
      ),
      signal: null,
      child: null,
    };
  }

  if (
    agent.offspring < MAX_OFFSPRING &&
    agent.generation < MAX_GENERATION &&
    (agent.attention > 0.66 || impulse > 0.87)
  ) {
    const childId = `${agent.id}/${agent.offspring + 1}`;
    const child = makeAgent(
      childId,
      time,
      agent.id,
      agent.generation + 1,
      [agent.id],
    );
    return {
      agent: startCommand(
        {
          ...agent,
          attention: clamp(agent.attention - 0.12),
          offspring: agent.offspring + 1,
          peers: [...agent.peers, childId],
        },
        time,
        `fork --shell ${childId}`,
        `opened ${childId} beside this shell`,
      ),
      signal: null,
      child,
    };
  }

  const peer = agent.peers[Math.floor(impulse * agent.peers.length)];
  if (peer && impulse > 0.31) {
    const token = tokenFor(agent.phase * 53 + time * 0.77);
    return {
      agent: startCommand(
        { ...agent, attention: clamp(agent.attention - 0.035) },
        time,
        `send --to ${peer} --token ${token}`,
        `sent “${token}” toward ${peer}`,
      ),
      signal: {
        id: `signal/${agent.id}/${agent.nextLine}`,
        from: agent.id,
        to: peer,
        token,
        expiresAt: time + 8,
      },
      child: null,
    };
  }

  return {
    agent: startCommand(
      { ...agent, attention: clamp(agent.attention + 0.035) },
      time,
      "scan --nearby",
      `heard ${agent.peers.length} local channel${agent.peers.length === 1 ? "" : "s"}`,
    ),
    signal: null,
    child: null,
  };
}

export function advanceTerminalColony(
  colony: TerminalColony,
  deltaSeconds: number,
): TerminalColony {
  const time = colony.time + Math.min(deltaSeconds, 0.18);
  const settledAgents = colony.agents.map((agent) => {
    const settled = settleCommand(agent, time);
    return settled.active && time >= settled.active.startedAt + settled.active.duration
      ? { ...settled, active: null }
      : settled;
  });
  const current = {
    ...colony,
    agents: settledAgents,
    signals: colony.signals.filter((signal) => signal.expiresAt > time),
    fragments: colony.fragments.filter((fragment) => fragment.expiresAt > time),
    time,
  };
  const decisions = current.agents.map((agent) => {
    if (agent.active || agent.nextDecisionAt > time) return null;
    return decideForAgent(agent, current, time);
  });

  const decisionById = new Map<string, AgentDecision>();
  const emittedSignals: DirectedSignal[] = [];
  const children: TerminalAgent[] = [];

  for (const decision of decisions) {
    if (!decision) continue;
    decisionById.set(decision.agent.id, decision);
    if (decision.signal) emittedSignals.push(decision.signal);
    if (decision.child) children.push(decision.child);
  }

  return {
    ...current,
    agents: [
      ...current.agents.map((agent) => decisionById.get(agent.id)?.agent ?? agent),
      ...children,
    ],
    signals: [...current.signals, ...emittedSignals],
  };
}

export function releaseFragment(colony: TerminalColony): TerminalColony {
  const token = tokenFor(colony.nextFragment * 17 + colony.time * 3.1);
  return {
    ...colony,
    fragments: [
      ...colony.fragments.filter((fragment) => fragment.expiresAt > colony.time),
      {
        id: `fragment/${colony.nextFragment}`,
        token,
        expiresAt: colony.time + 5.5,
      },
    ].slice(-2),
    nextFragment: colony.nextFragment + 1,
  };
}

export function activeCommandText(agent: TerminalAgent, time: number) {
  if (!agent.active) return null;
  const progress = clamp((time - agent.active.startedAt) / agent.active.duration);
  const length = Math.max(1, Math.ceil(agent.active.text.length * progress));
  return agent.active.text.slice(0, length);
}
