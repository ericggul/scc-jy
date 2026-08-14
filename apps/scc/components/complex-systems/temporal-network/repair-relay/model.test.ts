import assert from "node:assert/strict";
import test from "node:test";
import {
  createTemporalRepairState,
  DEFAULT_TEMPORAL_REPAIR_PARAMETERS,
  getLocalRepairRate,
  getTemporalRepairMetrics,
  introduceShock,
  stepTemporalRepairNetwork,
  type TemporalContact,
  type TemporalRepairState,
} from "./model.ts";

function advance(state: TemporalRepairState, duration: number) {
  let next = state;
  for (let elapsed = 0; elapsed < duration; elapsed += 0.04) {
    next = stepTemporalRepairNetwork(
      next,
      Math.min(0.04, duration - elapsed),
    ).state;
  }
  return next;
}

function assertValid(state: TemporalRepairState) {
  const nodeIds = new Set(state.nodes.map((node) => node.id));
  const contactIds = new Set<number>();
  const packetIds = new Set<number>();
  for (const contact of state.contacts) {
    assert.ok(nodeIds.has(contact.a) && nodeIds.has(contact.b));
    assert.ok(contact.start >= 0 && contact.duration > 0);
    assert.ok(!contactIds.has(contact.id));
    contactIds.add(contact.id);
  }
  for (const fault of state.faults) {
    assert.ok(nodeIds.has(fault.node));
    assert.ok(fault.remaining >= -1e-8);
  }
  for (const packet of state.packets) {
    assert.ok(nodeIds.has(packet.origin) && nodeIds.has(packet.holder));
    assert.ok(packet.amount > 0);
    assert.ok(!packetIds.has(packet.id));
    packetIds.add(packet.id);
  }
}

test("the temporal repair field is deterministic and remains structurally valid", () => {
  let first = createTemporalRepairState({ seed: 7201 });
  let second = createTemporalRepairState({ seed: 7201 });
  for (let step = 0; step < 1_800; step += 1) {
    first = stepTemporalRepairNetwork(first, 0.04).state;
    second = stepTemporalRepairNetwork(second, 0.04).state;
    assertValid(first);
  }
  assert.deepEqual(first, second);
  assert.ok(getTemporalRepairMetrics(first).resolved > 0);
});

test("a time-respecting path carries knowledge while the same static path in reverse order does not", () => {
  const ordered: TemporalContact[] = [
    { id: 1, a: 0, b: 1, start: 0.4, duration: 0.1, capacity: 0.16, kind: "local" },
    { id: 2, a: 1, b: 2, start: 0.9, duration: 0.1, capacity: 0.16, kind: "local" },
  ];
  const reversed: TemporalContact[] = [
    { id: 1, a: 1, b: 2, start: 0.4, duration: 0.1, capacity: 0.16, kind: "local" },
    { id: 2, a: 0, b: 1, start: 0.9, duration: 0.1, capacity: 0.16, kind: "local" },
  ];
  const start = introduceShock(createTemporalRepairState({
    seed: 91,
    contacts: ordered,
    scheduledShocks: [],
  }), 0, 0.24);
  const forward = advance(start, 1.25);
  const backward = advance(introduceShock(createTemporalRepairState({
    seed: 91,
    contacts: reversed,
    scheduledShocks: [],
  }), 0, 0.24), 1.25);
  const faultId = forward.faults[0]?.id;
  assert.ok(faultId);
  assert.ok(forward.nodes[2]?.knowledge.some((entry) => entry.faultId === faultId));
  assert.ok(!backward.nodes[2]?.knowledge.some((entry) => entry.faultId === faultId));
});

test("randomly permuting timestamps preserves contacts but changes their sequence", () => {
  const sequenced = createTemporalRepairState({ seed: 456, contactOrder: "sequenced" });
  const permuted = createTemporalRepairState({ seed: 456, contactOrder: "permuted" });
  const pairCounts = (state: TemporalRepairState) => {
    const counts = new Map<string, number>();
    for (const contact of state.contacts) {
      const key = [contact.a, contact.b].sort((a, b) => a - b).join(":");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  assert.deepEqual(pairCounts(permuted), pairCounts(sequenced));
  assert.deepEqual(
    [...permuted.contacts.map((contact) => contact.start)].sort((a, b) => a - b),
    [...sequenced.contacts.map((contact) => contact.start)].sort((a, b) => a - b),
  );
  assert.notDeepEqual(
    permuted.contacts.map((contact) => [contact.a, contact.b]),
    sequenced.contacts.map((contact) => [contact.a, contact.b]),
  );
});

test("the preserved graph follows a different macro trajectory when only contact order is permuted", () => {
  const sequenced = advance(introduceShock(createTemporalRepairState({
    seed: 456,
    contactOrder: "sequenced",
    scheduledShocks: [],
  }), 0, 0.32), 8);
  const permuted = advance(introduceShock(createTemporalRepairState({
    seed: 456,
    contactOrder: "permuted",
    scheduledShocks: [],
  }), 0, 0.32), 8);
  const sequencedMetrics = getTemporalRepairMetrics(sequenced);
  const permutedMetrics = getTemporalRepairMetrics(permuted);
  assert.notEqual(permutedMetrics.reachability, sequencedMetrics.reachability);
  assert.notEqual(permutedMetrics.packets, sequencedMetrics.packets);
});

test("resolved shocks create an explicit local learning gain rather than a visual-only recovery", () => {
  const noContacts = createTemporalRepairState({
    seed: 33,
    contacts: [],
    scheduledShocks: [],
  });
  const before = noContacts.nodes[4];
  assert.ok(before);
  const initialRate = getLocalRepairRate(before);
  const repaired = advance(introduceShock(noContacts, 4, 0.07), 6);
  const after = repaired.nodes[4];
  assert.ok(after);
  assert.ok(after.resolutions > 0);
  assert.ok(after.practice > before.practice);
  assert.ok(getLocalRepairRate(after) > initialRate);
  assert.ok(getTemporalRepairMetrics(repaired).meanService > 0.99);
  assert.equal(DEFAULT_TEMPORAL_REPAIR_PARAMETERS.localRepair, 0.018);
});
