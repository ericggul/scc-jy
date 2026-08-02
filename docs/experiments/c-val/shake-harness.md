# C-VAL versioned mobile-shake verification harness

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
# defaults to C-VAL 2
```

The default command generates one deterministic human-like gesture trace and
replays it through five independent market random seeds. It exits:

- `0` when every structural gate and at least 80% of stochastic response paths
  pass;
- `1` when the trace is valid but an acceptance gate fails;
- `2` when arguments or trace data are invalid.

For a machine-readable report:

```bash
pnpm test:c-val:shake --version 2 --json
```

For exact reproduction of one market path:

```bash
pnpm test:c-val:shake --version 2 --seed 12648430 --market-seed 202
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
pnpm test:c-val:shake --version 2 --trace recordings/person-01-shake.json
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

## Verification philosophy

Market-response tests must not encode a second, hand-written market model.
They must also not turn one observed run into inline constants such as
`V >= 0.7`, `price change >= 5%`, or `range >= 10`. Such constants become stale
when the production calibration changes and encourage tuning the test until it
passes.

Every replay therefore advances two production runtimes with the same random
seed and clock:

1. the treatment market receives the real mobile transmission path;
2. the matched control market receives no phone intervention.

Response magnitude is evaluated relative to that run's matched control, not
against a fixed price number. The VAL onset is the greatest observed rise in
the treatment-to-control parameter distance, so no absolute V threshold defines
the change point. Execution latency ends when treatment price leaves the
matched-control path; the allowed duration is one market day exported by the
production adapter. Runtime memory and payload limits are likewise read from
production calibration.

Absolute constants remain only where the external object itself supplies the
meaning: browser sensor-rate plausibility, valid orientation bounds, and the
chosen multi-seed pass proportion. They are not used to manufacture market
response.

A mixed three-axis shake cannot identify the isolated causal sign of L because
V, A, and L co-vary. The integrated harness therefore checks that depth leaves
the untouched path. Directionality—higher L produces greater depth and lower
impact—is owned by the separate paired model test that holds seed, V, and A
fixed and changes only L. This prevents a confounded correlation from becoming
a fake acceptance rule.

Do not tune policy to rescue a failing path. Inspect the treatment/control
report, then fix production behavior or explicitly revise the experiment
contract and this document.

## Acceptance gates

Input gates verify:

- 40–70 Hz effective raw sampling;
- realistic jitter and at least one dropped-frame gap;
- all transmitted and runtime V/A/L axes move;
- production smoothing reduces the raw transmitted span;
- effective V exceeds the matched untouched market.

Market-response gates verify:

- reference value varies more than the matched untouched market;
- actual executions vary more than the matched untouched market;
- actual price leaves its matched-control path within one exported market day;
- production participants submit and execute real orders;
- resting depth leaves the matched untouched path.

Integrity gates require every random path to preserve:

- cash and inventory;
- an uncrossed, finite book;
- execution-derived last price;
- production-calibrated book and snapshot bounds.

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

## Version isolation

The `--version 1|2` flag dynamically loads only that version's trace, adapter,
acceptance policy, and production model. Each version owns a physical copy of
these modules. The default package command targets V2; use
`pnpm test:c-val:shake:v1` to verify the frozen baseline separately.

