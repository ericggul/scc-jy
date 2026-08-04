# C-VAL agent onboarding

C-VAL is a versioned, multi-device market experiment. One phone changes three
market conditions; a shared socket runtime turns those conditions into agent
orders and executions; controller and screen clients observe the resulting
market. Start here before changing any C-VAL file.

## Current version state

On 2026-08-04, the former C-VAL 2 implementation was promoted to C-VAL 1. The
old C-VAL 1 controller is no longer the baseline. Its replacement is the exact
six-area market-workstation controller that was previously served by C-VAL 2.

- **C-VAL 1 is the frozen baseline.** It preserves the promoted implementation
  under the `c-val:1` socket identity and `/c-val/1/*` routes.
- **C-VAL 2 is the active iteration branch.** It replaces V1's ambiguous three
  axes with one fixed forward/back beta angle. That angle simultaneously creates
  V intensity, signed A direction, and inverse L depth; opposite angles create
  opposite execution-derived price tendencies with symmetric strength. V/A/L
  remain intermediate state, not GUI controls. V2 also adds the dormant
  pre-participant phase and keeps its own `c-val:2` identity.

The two versions intentionally duplicate code. Do not replace that duplication
with cross-version imports: a later V2 edit must not rewrite the V1 archive.

## The system in one pass

```text
phone orientation
  -> calibrated alpha / beta / gamma deltas
  -> volatility / activity / liquidity targets
  -> version-owned socket room and 50 ms runtime tick
  -> market participants submit, cancel, and match orders
  -> bounded server snapshot
  -> controller and screen clients derive presentation
```

The three phone-controlled values are conditions, not directly assigned visual
outputs:

- `V` (volatility) changes information shocks, valuation dispersion, quote
  distance, provider size, cancellation, and replenishment risk.
- `A` (activity) changes the frequency of participant order submission.
- `L` (liquidity) changes passive-provider participation, order size, and
  replenishment.

Orders then determine the book. Matching determines executions. The last
execution—and only the last execution—sets the displayed market price. The
server owns abstract market state; browsers derive colors, widths, traces,
layout, and other presentation.

## Public roles and routes

Every version is a complete compatible system:

| Role | Route | Responsibility |
| --- | --- | --- |
| Mobile | `/c-val/[version]/mobile` | Permission, zero pose, orientation capture, V/A/L preview, input transmission |
| Controller | `/c-val/[version]/controller` | Full market observation and authorized reset |
| Individual screen | `/c-val/[version]/screen/[screen]` | One display selected from `market`, `news`, `media`, or `employment` |
| Whole screen set | `/c-val/[version]/screen/whole` | Composes all registered screens |

`news`, `media`, and `employment` currently reuse the initial market wrapper.
They do not yet model separate macroeconomic or social systems.

## Ownership map

```text
app/c-val/
  page.tsx                              route index
  [version]/controller/page.tsx         thin controller dispatcher
  [version]/mobile/page.tsx             thin mobile dispatcher
  [version]/screen/[screen]/page.tsx    thin screen dispatcher

components/c-val/
  experiments.ts                        versions and screen IDs only
  {1,2}/                                complete version-owned browser copy
    model/                              TypeScript snapshot contract + local initial state
    mobile/                             device orientation and calibration UI
    controller/                         market workstation and its local CSS
    screen/                             display views and presentation helpers
    transport/                          versioned Socket.IO client events

socket/experiments/c-val/
  {1,2}/                                complete version-owned server copy
    index.mjs                           room, event prefix, roles, timer, reset
    model.mjs                           participants, order flow, runtime, snapshots
    order-book.mjs                      price/FIFO matching and cancellation
    calibration.mjs                     empirical constants and scenario choices
    orientation.mjs                     raw orientation normalization
    diagnostics.mjs                     bounded one-second runtime summaries
    shake-*.mjs                         offline motion harness and adapter
    *.test.mjs                          pure and socket-boundary tests
```

Shared files have deliberately narrow jobs:

- `components/c-val/experiments.ts` exposes route versions and screen IDs. It
  must not own market equations or presentation.
- `socket/experiments/index.mjs` registers the two socket experiments. It must
  not merge their rooms or runtime state.
- `socket/experiments/c-val/version-isolation.test.mjs` proves IDs, rooms, and
  event names do not collide.

## Version identity and isolation

| Version | Experiment ID | Room | Event prefix | Diagnostic prefix |
| --- | --- | --- | --- | --- |
| 1 | `c-val:1` | `experiment:c-val:1` | `c-val-1:*` | `[c-val:v1:1s]` |
| 2 | `c-val:2` | `experiment:c-val:2` | `c-val-2:*` | `[c-val:v2:1s]` |

Only a joined mobile may send input. Only a joined controller may reset. V1
sends calibrated orientation; V2 sends the same direct mapping as V/A/L plus
its current engagement state. V2 averages simultaneous active phones equally.
A shared 50 ms timer coalesces input, advances the market, and broadcasts only
while clients occupy that version's room.

Snapshots and internal rolling state are bounded. A snapshot carries nine book
levels per side, 16 recent orders, 12 recent trades, and 120 history samples.
Orders and trades use stable server-created IDs; rendered lists must retain
those IDs as React keys.

## Market and presentation boundaries

The server may own parameters, participants, valuations, orders, cancellations,
executions, book state, market measurements, diagnostics, and time. It must not
broadcast color, width, opacity, animation, layout, or active/highlight state.

The browser may format and normalize snapshot values and derive visual marks.
It must not generate market orders, match trades, mutate server state, or invent
unsupported securities, news, forecasts, correlations, or participant data.

The promoted controller has six stable observation areas: market conditions,
price discovery, realized market, agent order flow, market by price, and time
and sales. Its dense workstation grammar is part of the preserved V1 contract;
a data, socket, or model change does not authorize a redesign.

## Safe change workflow

1. Read [the repository tinkering method](../../foundations/tinkering.md), this
   file, and the target version document.
2. State the one changed relation and the visual, behavioral, route, and socket
   invariants that must remain.
3. Work only in `components/c-val/2/*`, `socket/experiments/c-val/2/*`, and
   [the V2 record](./2.md) unless the request explicitly targets V1 or shared
   routing.
4. Keep browser and server contracts aligned: snapshot literals, calibration
   IDs, version fields, rooms, joins, and event names must all use the same
   version.
5. Update or add pure tests beside the capability being changed. Preserve
   stable IDs and bounded payloads.
6. Record the changed variable, retained invariants, result, and unresolved
   question in the target version document.

When a future V2 state is promoted, copy the complete working V2 browser and
server implementation into V1, convert only version identity, verify isolation,
then continue from a fresh independent V2 copy. Never leave V1 importing V2.

## Static verification

Do not start a development server and do not run `pnpm build`, `pnpm dev`, or
`pnpm dev:http`. The normal non-runtime checks are:

```text
pnpm lint
pnpm exec tsc --noEmit
node --test components/c-val/experiments.test.ts
node --test socket/experiments/c-val/1/*.test.mjs
node --test socket/experiments/c-val/2/*.test.mjs
node --test socket/experiments/c-val/version-isolation.test.mjs
```

Browser or runtime interaction checks are performed only when explicitly
requested, against an already-running HTTPS server.

## Detailed records

- [C-VAL 1](./1.md): promoted and frozen behavioral, visual, and market contract.
- [C-VAL 2](./2.md): active branch contract and future iteration record.
- [C-VAL 2 rejected interaction](./2-interaction-failure-review.md): low- and
  high-level analysis of the learned-axis, cadence, dwell, pressure, and mobile
  UI failure that must not be repeated.
- [Mobile-shake harness](./shake-harness.md): repeatable synthetic and recorded
  motion verification.
- [Voice iteration](./voice-iteration.md): version-independent emotional speech
  batch generator and prompt ledger.
