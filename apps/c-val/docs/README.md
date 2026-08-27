# C-VAL agent onboarding

C-VAL is a versioned, multi-device market experiment. One phone changes three
market conditions; a shared socket runtime turns those conditions into agent
orders and executions; controller and screen clients observe the resulting
market. Start here before changing any C-VAL file.

## Current version state

On 2026-08-11, the current C-VAL 2 implementation was synchronized into C-VAL
1 as an independent version-owned copy. V1 keeps its own component imports,
socket room, events, model snapshot version, and recording path.

- **C-VAL 1 is the complete independent mirror.** It retains casino,
  rollercoaster, and `screen-legacy` while serving the synchronized current
  mobile, controller, news, media, and comments implementations under
  `c-val:1`.
- **C-VAL 2 is the active WIP iteration branch.** It reads the browser's three
  alpha/beta/gamma rotation-rate components and applies the same stateless soft
  response to every axis. Total rotation energy raises V and lowers L; the
  signed sum drives A. There is no pose, quaternion, mode, learned axis or
  endpoint clamp. V/A/L remain intermediate state, not GUI controls. Real-phone
  acceptance is still pending.
  V2 also adds the dormant pre-participant phase and keeps its own `c-val:2`
  identity.

C-VAL 2 currently has a temporary three-button mapping comparison shared by
three mobile presentations. `/2/mobile` now defaults to v3: its spherical
attitude globe with the exact v1 bottom V/A/L readout. `/2/mobile/v1` preserves
the former default, and `/2/mobile/v2` preserves the alpha/beta/gamma
gyroscope-interface trial. The additional mobile routes do not introduce
another screen, market, socket room, or C-VAL version. Git `HEAD` remains checkpoint `07a5aaf`; consult the
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
| Mobile | `/[version]/mobile` | Permission, version-specific sensor capture, V/A/L preview, input transmission |
| Controller | `/[version]/controller` | Full market observation and authorized reset |
| Individual screen | `/[version]/screen/[screen]` | V1 exposes `rollercoaster`, `news`, `media`, `casino`, `comments`, and `comments-legacy`; V2 exposes only `news`, `media`, `comments`, and `comments-legacy` |
| Whole screen set | `/[version]/screen/whole` | Composes all registered screens |

C-VAL 1's whole set retains the carried 28-point rollercoaster price track,
news, and audiovisual media. C-VAL 2's whole set now contains only news and
media; its casino, rollercoaster, and complete `screen-legacy` source were
removed on 2026-08-11. The news columns accumulate independently while
retaining the same compact visual grammar. V1 casino remains a price-register
instrument. Comments turns
actual rapid one-second movement into bounded context-minimal voice reactions
and a typographic comment field. Both are
additional standalone screens and do not change the active composition.

C-VAL 2 preserves its former default at `/2/mobile/v1` and exposes
`/2/mobile/v2` and `/2/mobile/v3` as presentation-only iterations of the same
mobile role. The un-suffixed mobile route selects the version's current default
without changing a market, socket room, or C-VAL version.

## Ownership map

```text
apps/c-val/app/
  page.tsx                              route index
  [version]/controller/page.tsx         thin controller dispatcher
  [version]/mobile/page.tsx             thin mobile dispatcher
  [version]/mobile/v1/page.tsx          preserved V2 mobile v1 presentation
  [version]/mobile/v2/page.tsx          C-VAL 2 mobile presentation trial
  [version]/mobile/v3/page.tsx          v2 globe plus v1 V/A/L default presentation
  [version]/screen/[screen]/page.tsx    thin screen dispatcher

apps/c-val/components/
  experiments.ts                        versions and screen IDs only
  {1,2}/                                complete version-owned browser copy
    model/                              TypeScript snapshot contract + local initial state
    mobile/                             device orientation and calibration UI
      v2/                               gyroscope presentation and pure readout
      v3/                               preserved globe and v1 bottom readout
    controller/                         market workstation and its local CSS
    screen/                             display views and presentation helpers
    transport/                          versioned Socket.IO client events

apps/c-val/socket/experiments/
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

- `apps/c-val/components/experiments.ts` exposes route versions and screen IDs. It
  must not own market equations or presentation.
- `socket/experiments/index.mjs` registers the two socket experiments. It must
  not merge their rooms or runtime state.
- `apps/c-val/socket/experiments/version-isolation.test.mjs` proves IDs, rooms, and
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

1. Read [the repository tinkering method](../../../docs/foundations/tinkering.md), this
   file, and the target version document.
2. State the one changed relation and the visual, behavioral, route, and socket
   invariants that must remain.
3. Work only in `apps/c-val/components/2/*`,
   `apps/c-val/socket/experiments/2/*`, and
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
pnpm --filter @scc/c-val typecheck
node --test apps/c-val/socket/experiments/1/*.test.mjs
node --test apps/c-val/socket/experiments/2/*.test.mjs
node --test apps/c-val/socket/experiments/version-isolation.test.mjs
```

Browser or runtime interaction checks are performed only when explicitly
requested, against an already-running HTTPS server.

## Detailed records

- [Next changes](./2026-08-26-next-change-readiness.md): change list,
  checkpoint, and concurrent-work note.
- [Relay reset route](./reset-route.md): protected C-VAL-wide reload and PM2
  relay restart control.
- [C-VAL 1](./1.md): promoted and frozen behavioral, visual, and market contract.
- [C-VAL 2](./2.md): active branch contract and future iteration record.
- [C-VAL 2 mobile v2 gyroscope interface](./2-mobile-v2-gyroscope-interface-2026-08-11.md):
  presentation-only alpha/beta/gamma globe, exact live equations, retained
  behavioral invariants, and pending real-phone acceptance.
- [C-VAL 2 mobile v3](./2-mobile-v3-globe-v1-readout-2026-08-11.md): current
  default presentation, with the copied v2 globe, exact v1 bottom V/A/L
  readout, and unchanged behavior.
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
- [Controller-density reverted attempt](./2-controller-density-revert-2026-08-26.md):
  the exact failed 2560-density change and its boundary for a future retry.
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
