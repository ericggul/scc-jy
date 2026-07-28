# C-VAL mobile-shake verification harness

## Objective

This workflow verifies the exact interaction chain:

```text
browser orientation
→ mobile baseline calibration and 16 ms transmission throttle
→ server-side 50 ms input coalescing
→ V/A/L market conditions
→ participant orders and cancellations
→ executions, depth, reference value, and last-executed price
```

It runs the production C-VAL model in-process. It does not start a server,
open a browser, mutate the shared socket room, or copy the market equations
into test code.

## Default agent command

```bash
pnpm test:c-val:shake
```

The default command generates one deterministic human-like gesture trace and
replays it through five independent market random seeds. It exits:

- `0` when every structural gate and at least 80% of stochastic response paths
  pass;
- `1` when the trace is valid but an acceptance gate fails;
- `2` when arguments or trace data are invalid.

For a machine-readable report:

```bash
pnpm test:c-val:shake -- --json
```

For exact reproduction of one market path:

```bash
pnpm test:c-val:shake -- --seed 12648430 --market-seed 202
```

## Gesture model

`shake-trace.mjs` produces raw browser `DeviceOrientationEvent` samples rather
than direct V/A/L values. The `one-hand-bursts-v1` profile contains rest,
pickup, three unequal shake bursts, short pauses, recovery, and rest.

The synthetic sensor includes:

- nominal 60 Hz sampling with timestamp jitter;
- intermittent dropped-frame gaps;
- alpha wraparound at 360 degrees;
- browser-valid beta and gamma bounds;
- correlated multi-axis motion with phase lag;
- several hand-scale shake frequencies rather than one sine wave;
- tremor, low-frequency drift, and amplitude envelopes;
- stable event IDs and deterministic seeded randomness.

This is a biomechanically plausible synthetic trace, not measured human IMU
data. It is useful for repeatable regression and counterexample generation,
but must not be cited as empirical motion capture.

## Replaying recorded data

The same runner accepts a real or externally recorded JSON trace:

```bash
pnpm test:c-val:shake -- --trace recordings/person-01-shake.json
```

The required envelope is:

```json
{
  "schemaVersion": 1,
  "kind": "browser-device-orientation",
  "profile": "recorded-person-01",
  "provenance": { "type": "recorded" },
  "durationMs": 10500,
  "events": [
    {
      "id": "orientation-1",
      "tMs": 0,
      "absolute": false,
      "alpha": 351.2,
      "beta": -3.1,
      "gamma": 2.4
    }
  ]
}
```

Event IDs must be unique, timestamps must increase, and axes must be finite
and within browser DeviceOrientation bounds. The first event is the calibration
baseline, matching the mobile interface.

## Automatic production coupling

The workflow has four replaceable modules:

1. `orientation.mjs` owns baseline calibration and is imported by both the
   production mobile component and the replay harness.
2. `shake-trace.mjs` owns synthetic or recorded raw sensor traces.
3. `shake-system-adapter.mjs` is the only market-system boundary. It imports
   and invokes the production `model.mjs` functions directly.
4. `shake-acceptance.mjs` owns behavioral and structural pass/fail policy.

Changes to order matching, participants, V/A/L dynamics, timing, or price
formation in `model.mjs` are therefore exercised on the next harness run
without copying changes into the generator or runner. Changes to the mobile
baseline calculation also affect both production and replay immediately.

If a future market replaces the runtime API itself, update only
`shake-system-adapter.mjs`. The trace schema, mobile replay, stochastic suite,
reporting, and acceptance policy remain intact. An alternative adapter can
also be injected programmatically; the adapter-injection test ensures the
runner does not bypass it.

Do not adjust acceptance thresholds merely to make a changed model pass.
First inspect the per-seed JSON report. Change policy only when the experiment's
intended observable contract changes, and document that contract change here.

## Acceptance gates

Input gates verify:

- 40–70 Hz effective raw sampling;
- realistic jitter and at least one dropped-frame gap;
- at least 80 points of transmitted V, A, and L range;
- at least 30 points of runtime V, A, and L range after server smoothing;
- effective persistent V reaches 70.

Market-response gates verify:

- reference-value range of at least `0.50`;
- last-executed-price range of at least `0.50`;
- a five-cent execution response within three seconds of input onset;
- at least 250 orders and 60 executions;
- at least a twofold five-level depth range.

Integrity gates require every random path to preserve:

- cash and inventory;
- an uncrossed, finite book;
- execution-derived last price;
- no more than 420 resting orders;
- no more than a 32 KB bounded snapshot.

Market-response gates must pass on at least four of five independent market
paths. Integrity, sensor, and input gates must pass on all paths. This avoids
both one-seed false confidence and the impossible requirement that every
stochastic path produce an identical price range.

## Failure routing

- Input-span failure: inspect mobile calibration, axis mapping, throttling, or
  trace amplitude.
- Persistent-risk failure: inspect V-to-regime timing.
- Value-response failure: inspect the information process and value traders.
- Executed-price or latency failure with a passing value gate: inspect order
  aggressiveness, matching, and liquidity absorption.
- Liquidity-dynamics failure: inspect provider placement, withdrawal, and
  replenishment.
- Conservation or market-integrity failure: treat as a blocking model defect,
  not a threshold-tuning problem.

The one-second live `[c-val:1s]` log and this offline harness use complementary
evidence: the live log diagnoses an observed phone session, while the harness
provides deterministic regression and multi-seed robustness.
