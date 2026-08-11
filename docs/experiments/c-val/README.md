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
- **C-VAL 2 is the active WIP iteration branch.** It reads the browser's three
  alpha/beta/gamma rotation-rate components and applies the same stateless soft
  response to every axis. Total rotation energy raises V and lowers L; the
  signed sum drives A. There is no pose, quaternion, mode, learned axis or
  endpoint clamp. V/A/L remain intermediate state, not GUI controls. Real-phone
  acceptance is still pending.
  V2 also adds the dormant pre-participant phase and keeps its own `c-val:2`
  identity.

C-VAL 2 currently has a temporary three-button mapping comparison shared by two
mobile presentations. `/c-val/2/mobile` remains v1,
`/c-val/2/mobile/v2` is the alpha/beta/gamma gyroscope-interface trial, and
`/c-val/2/mobile/v3` combines the v2 globe with the exact v1 bottom V/A/L
readout. The additional mobile routes do not introduce another screen, market,
socket room, or C-VAL version. Git `HEAD` remains checkpoint `07a5aaf`; consult the
[post-checkpoint ledger](./2-iteration-ledger-2026-08-05.md) before touching the
working-tree WIP.

The two versions intentionally duplicate code. Do not replace that duplication
with cross-version imports: a later V2 edit must not rewrite the V1 archive.

## The system in one pass

```text
active V2 phone three-axis rotation rate
  -> one stateless soft V/A/L equation
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
| Mobile | `/c-val/[version]/mobile` | Permission, version-specific sensor capture, V/A/L preview, input transmission |
| Controller | `/c-val/[version]/controller` | Full market observation and authorized reset |
| Individual screen | `/c-val/[version]/screen/[screen]` | V1 selects `market`, `news`, `media`, or `employment`; V2 actively composes `rollercoaster`, `news`, and `media`, with `casino` and `comments` available as additional standalone screens |
| Whole screen set | `/c-val/[version]/screen/whole` | Composes all registered screens |

C-VAL 1 preserves its four-screen initial wrapper. C-VAL 2's active whole set
remains a carried 28-point price track, a two-thread market/finance and
society/politics news wire, and audiovisual media. The news columns accumulate
independently while retaining the same compact visual grammar. Casino is a
price-register instrument. Comments turns
actual rapid one-second movement into bounded context-minimal voice reactions
and a typographic comment field. Both are
additional standalone screens and do not change the active composition.

C-VAL 2 also exposes `/c-val/2/mobile/v2` and `/c-val/2/mobile/v3` as
presentation-only iterations of its mobile role. The un-suffixed mobile route
remains the v1 default.

## Ownership map

```text
app/c-val/
  page.tsx                              route index
  [version]/controller/page.tsx         thin controller dispatcher
  [version]/mobile/page.tsx             thin mobile dispatcher
  [version]/mobile/v2/page.tsx          C-VAL 2 mobile presentation trial
  [version]/mobile/v3/page.tsx          v2 globe plus v1 V/A/L readout trial
  [version]/screen/[screen]/page.tsx    thin screen dispatcher

components/c-val/
  experiments.ts                        versions and screen IDs only
  {1,2}/                                complete version-owned browser copy
    model/                              TypeScript snapshot contract + local initial state
    mobile/                             device orientation and calibration UI
      v2/                               gyroscope presentation and pure readout
      v3/                               preserved globe and v1 bottom readout
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

Only a joined mobile may send input. A joined controller may reset either
version; C-VAL 2 also permits its joined mobile to reset when its temporary
mapping-comparison selector changes. V1 sends calibrated orientation. V2 sends
one of three explicitly selected phone-to-V/A/L mappings into the same unchanged
C-VAL 2 market runtime and averages simultaneous active phones equally.
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
- [C-VAL 2 mobile v2 gyroscope interface](./2-mobile-v2-gyroscope-interface-2026-08-11.md):
  presentation-only alpha/beta/gamma globe, exact live equations, retained
  behavioral invariants, and pending real-phone acceptance.
- [C-VAL 2 mobile v3](./2-mobile-v3-globe-v1-readout-2026-08-11.md): copied v2
  globe with the exact v1 bottom V/A/L readout and unchanged behavior.
- [C-VAL 2 society-news split](./2-news-society-split-2026-08-11.md): independent
  market/finance and society/politics threads, parametric headline grammar,
  retained visual invariants, and evidence boundaries.
- [Bloomberg workstation visual wrapper](./bloomberg-visual-wrapper.md):
  reusable C-VAL observer-workstation tokens, primitives, profile boundaries,
  and adoption review.
- [C-VAL 2 Bloomberg news migration](./2-news-bloomberg-migration-2026-08-10.md):
  preserved screen archive and the bounded active news-monitor trial.
- [C-VAL 2 Bloomberg screen rebuild](./2-bloomberg-screen-rebuild-2026-08-11.md):
  superseded execution-monitor / trajectory-monitor trial and its recorded
  visual grammar and performance limits.
- [C-VAL 2 casino + rollercoaster reconsideration](./2-casino-rollercoaster-reconsideration-2026-08-11.md):
  accepted settled-register and carried-track replacement, plus the flat raw
  active-screen surface contract.
- [C-VAL 2 casino screen](./2-casino.md): historical three-drum trial,
  preserved as a rejected approach rather than an active contract.
- [C-VAL 2 post-checkpoint iteration ledger](./2-iteration-ledger-2026-08-05.md):
  checkpoint, attempted algorithms, observed failures, user feedback, current
  WIP equation, retained invariants, and pending real-phone gates.
- [C-VAL 2 rejected interaction](./2-interaction-failure-review.md): low- and
  high-level analysis of the learned-axis, cadence, dwell, pressure, and mobile
  UI failure that must not be repeated.
- [Mobile-shake harness](./shake-harness.md): repeatable synthetic and recorded
  motion verification.
- [Voice iteration](./voice-iteration.md): version-independent emotional speech
  batch generator and prompt ledger.
- [Profanity timestamp and beep workflow](./beep-censoring.md): original-audio
  preservation, per-file alignment sidecars, accepted beep parameters, runtime
  Web Audio scheduling, and the acceptance audit.
- [C-VAL 2 comments screen](./2-comments.md): rapid-move admission, deterministic
  dialect and performance selection, bounded text field, and runtime censored
  speech playback.
- [Discord external publisher](./external-publisher.md): C-VAL-wide Discord
  transport and the V2 community-stream interpreter.
- [Slack external publisher](./slack-publisher.md): C-VAL-wide Slack Incoming
  Webhook transport and V2 one-second Korean research-report projection.
- [Telegram external publisher](./telegram-publisher.md): C-VAL-wide Telegram
  Bot API transport and V2 silent channel-bulletin projection.
