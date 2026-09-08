# C-VAL offline shake harness

This is a deterministic regression harness for the production market model. It
does not start a server, open a browser, mutate a socket room, or duplicate
market equations. It is **not** a real-phone acceptance test: it replays legacy
`DeviceOrientationEvent` traces through the compatibility adapter, whereas the
live mobile experience also has its own permission and sensor path.

## Run it

```sh
pnpm test:c-val:shake
pnpm test:c-val:shake -- --json
pnpm test:c-val:shake -- --seed 12648430 --market-seed 202
pnpm test:c-val:shake -- --trace recordings/person-01-shake.json
```

The default creates one deterministic, human-like trace and evaluates five
market seeds. Exit `0` means all structural gates and at least four of five
market-response paths passed; `1` is a failed gate; `2` is invalid input.

Recorded traces must be JSON envelopes with `schemaVersion: 1`, kind
`browser-device-orientation`, increasing unique event IDs/timestamps, and finite
browser-bounded `alpha`, `beta`, and `gamma` values. The first event is the
legacy calibration baseline.

## What is coupled

`shake-trace.mjs` creates or validates raw traces.
`shake-system-adapter.mjs` is the sole boundary to the production
`model.mjs`; it advances the actual runtime, matching, participants, and
calibration. `shake-acceptance.mjs` owns report policy. Update the adapter only
if the runtime API changes; do not copy market behavior into a trace or test.

Each replay compares an intervention runtime against an untouched runtime with
the same seed and clock. It checks relative change rather than fixed price or
V/A/L thresholds. The separate paired model tests own isolated liquidity
directionality, because a mixed-axis trace makes V, A, and L co-vary.

## Gates and diagnosis

- Input: plausible sensor cadence/jitter/gap, moving transmitted/runtime axes,
  and smoothing.
- Response: changed reference value, executions, price path, order activity,
  and depth relative to the matched control.
- Integrity: conserved cash/inventory, finite uncrossed book,
  execution-derived price, and calibrated payload/book bounds on every seed.

Treat conservation or book-integrity failure as blocking. For input failure,
inspect calibration, axis mapping, throttling, or trace amplitude; for value,
execution, or depth failure, inspect the production information, matching, and
liquidity paths. Do not tune the harness merely to pass.

The harness complements the one-second live diagnostic log: it makes
regressions repeatable, while only real-phone observation can establish the
participant’s bodily learning and enjoyment.
