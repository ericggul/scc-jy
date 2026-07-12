# Network System/Macro Economy — Four-Institution Relational Instrument

## Status and scope

`network-system/macro-economy` applies the K4 skeleton first tested in `dj/1` to four institutional actors:

| Screen | Node | Primary intervention |
| --- | --- | --- |
| 1 | Central Bank | policy stance |
| 2 | Treasury | fiscal impulse |
| 3 | Commercial Banks | credit availability |
| 4 | Private Economy (households + firms) | demand pressure |

Routes:

- `/network-system/controller/macro-economy`
- `/network-system/screen/macro-economy/1`
- `/network-system/screen/macro-economy/2`
- `/network-system/screen/macro-economy/3`
- `/network-system/screen/macro-economy/4`
- `/network-system/screen/macro-economy/whole`

The work is **not a calibrated economic simulation, forecast, policy model, or educational replica**. It is a signed system-dynamics experiment for testing whether a state change at one node can be experienced as it reappears—changed in sign, magnitude, and timing—through the other nodes. Values are normalized system coordinates, not empirical rates or indices.

## Why the former experiment failed

The former two-room reaction-diffusion experiment is not treated as structurally invalid. Its failure was experiential, situational, and artistic:

- Participants could not infer what feed, kill, diffusion, or coupling meant from the gesture and image.
- The mapping between hand position, injected material, and later visual change was not perceptible enough to form a usable expectation.
- The two screens looked like adjacent variants of the same generative texture. Their relationship was weaker than the autonomous image on each screen.
- Fixed simulation steps and pause-like intervals often felt broken rather than intentionally stateful.
- The reaction-diffusion reference supplied insufficient cultural, institutional, emotional, or situational stakes.
- The experience could largely have existed as a conventional two-panel media-art demo. Multiple devices were not necessary to its meaning.

This diagnosis must not be rewritten as a universal claim that diffusion, two rooms, nonlinearity, or a specific graph structure is inherently wrong.

## Graph and bounded dynamics

The controller preserves the six physical node pairs of K4, but the model is a
12-edge directed graph. Every pair contains two independently weighted causal
directions:

- Central Bank ↔ Treasury: stance / fiscal response
- Central Bank ↔ Banks: transmission and policy response
- Central Bank ↔ Private Economy: demand transmission and price signal
- Treasury ↔ Banks: funding
- Treasury ↔ Private Economy: fiscal flow and receipts
- Banks ↔ Private Economy: credit, lending conditions, and activity

### Minimal four-state model

The model has exactly one normalized state per node:

- `M`: Central Bank monetary stance (`−` easing, `+` tightening)
- `F`: Treasury fiscal impulse (`−` contractionary, `+` expansionary)
- `C`: Commercial Banks credit availability (`−` tight, `+` easy)
- `P`: Private Economy demand pressure (`−` weak, `+` strong)

These normalized states are internal calculation coordinates and must never be
presented as if they were economic observables. Each screen applies a declared
client-side affine transform and displays an operational level with a unit:

| Internal state | Screen observable | Display transform |
| --- | --- | --- |
| `M` | Policy rate | `3.50 + 2.00M` percent |
| `F` | Net fiscal flow | `2.00 + 4.00F` percent of GDP |
| `C` | Credit growth | `4.00 + 8.00C` percent year-on-year |
| `P` | Domestic-demand growth | `3.00 + 6.00P` percent year-on-year |

These coordinates are legible experimental units, not observed current data or
forecast estimates. The large screen number is always the current level. A
separate `Δ 1s` line is the signed recent change in percentage points. A leading
`+` or `−` must therefore never be used as a substitute for the level itself.

It does not pretend to be a calibrated forecast or a full stock-flow-consistent national accounting model. Its economic grounding is deliberately narrow: central-bank rates transmit through bank rates and credit conditions; bank lending creates deposits and repayment destroys them; fiscal revenue, expenditure, deficits, assets, and liabilities are flow/stock relationships; and every financial flow has a counterparty sector. See the [Bank of England on money creation](https://www.bankofengland.co.uk/quarterly-bulletin/2014/q1/money-creation-in-the-modern-economy.), the [ECB transmission mechanism](https://www.ecb.europa.eu/mopo/intro/transmission/html/index.en.html), and the [IMF Government Finance Statistics framework](https://data.imf.org/en/Datasets/GFS_SFCP).

The implemented system is the smaller signed influence model required by this experiment:

```text
dx_i / dt = adjustment_i × (baseline_i − x_i)
             + Σ [w_edge × a_(j→i) × tanh(x_j)]
```

The 12 directed coefficients are explicit and fixed:

| Edge | Direction | Coefficient | Minimal interpretation |
| --- | --- | ---: | --- |
| Central Bank–Treasury | `M → F` | `−0.38` | tighter stance constrains fiscal impulse through financing pressure |
| Central Bank–Treasury | `F → M` | `+0.30` | expansionary fiscal demand raises monetary-policy pressure |
| Central Bank–Banks | `M → C` | `−0.62` | tighter policy reduces credit availability |
| Central Bank–Banks | `C → M` | `+0.18` | stronger credit raises monetary-policy pressure |
| Central Bank–Private | `M → P` | `−0.42` | tighter policy weakens private demand |
| Central Bank–Private | `P → M` | `+0.48` | stronger demand/price pressure tightens stance |
| Treasury–Banks | `F → C` | `+0.22` | fiscal flow supports deposits and credit conditions |
| Treasury–Banks | `C → F` | `+0.12` | easier financial conditions support fiscal financing capacity |
| Treasury–Private | `F → P` | `+0.58` | expansionary fiscal impulse raises private demand |
| Treasury–Private | `P → F` | `−0.30` | stronger private activity reduces stabilizing fiscal impulse |
| Banks–Private | `C → P` | `+0.65` | credit availability supports private demand |
| Banks–Private | `P → C` | `+0.34` | stronger activity supports borrower quality and credit supply |

These are not claimed as universal empirical estimates. They are declared relative response coefficients: signs come from the stated transmission relationships, magnitudes establish a legible but bounded hierarchy, and every coefficient has one exact location in the four-node/12-directed-edge graph. There are no hidden relations or per-parameter sine-wave forcing terms.

The system is already running before a participant acts. The socket server owns a continuous clock, advances the four states every 100 ms, and broadcasts only abstract system data: node values, histories, persistent edge weights, signed edge flows, interventions, revision, and time.

The server never owns presentation decisions. It does not send color, width, opacity, animation phase, active styling, layout, or other visual values. Every browser client independently maps abstract state to its own visual wrapper. For example, the controller derives line width from edge weight and flow-marker position from edge flow and revision entirely on the client.

At every tick, each state adjusts toward its declared baseline while receiving the weighted signed influences of the other three nodes. Node shocks add an impulse directly to one state; subsequent movement is determined by the full matrix. Edge weights do **not** decay: they persist until the participant explicitly decreases or increases them again.

The participant does not calculate or submit the next system snapshot. Interaction changes the conditions under which the running system continues:

- a node intervention adds a one-time signed shock to that node’s current state;
- an edge intervention persistently increments or reduces exactly one directed coupling weight within a bounded range;
- the two directions in a physical pair are independent. Changing `M → F` from `1.00` to `3.00` produces exactly `3×` transmission through `M → F`; it does not alter `F → M`;
- every directed weight is persistently bounded to `[0.10, 10.00]`;
- a shock is a one-time addition to one node state; it is not a temporary UI value, and its later trajectory is determined by the full system;
- all later screen changes are produced by subsequent autonomous ticks and cross-node propagation.

## Parametric Interface architecture

The system and its visual wrappers are separate:

1. `model.ts` owns the TypeScript state, parameter, relation, intervention, and snapshot contracts used by the UI.
2. `graph.ts` owns the K4 positions, six physical node pairs, and 12 directed edges.
3. `presenter.ts` translates normalized values into wrapper-facing labels, rates, indices, and traces.
4. `wrappers/registry.ts` maps each institution to a replaceable React wrapper.
5. Individual files under `wrappers/` define the visual language of each screen.
6. `network-system-macro-economy-model.mjs` owns the continuously running server-side dynamics and applies interventions.
7. `network-system-macro-economy.mjs` owns the clock, room, intervention validation, and state broadcast.
8. `screen.tsx` only observes socket state, selects the wrapper, and applies the shared scaling mechanism.

A wrapper may be redesigned, détourned, or replaced without changing graph propagation or the socket contract. Conversely, relation weights may change without rewriting the institutional screens.

The current baseline is intentionally one shared minimal parameter wrapper. Institutional difference is carried by parameter names and values rather than four unrelated visual identities. The registry remains in place so later wrappers can be introduced without coupling them to the system model.

The relevant SCC design principles are semantic hierarchy, tabular numbers, stable model data outside the view, and responsive scaling of both frame and internal content. These are principles, not a mandate to imitate the surface of `stock/2`.

## Rejected interface design and prohibited patterns

This case is governed by the repository-wide rules in `docs/design-guidelines.md`.

The first four institutional wrappers were rejected. They combined dark backgrounds, neon accents, glows, oversized metrics, fake grids, badges, status rails, revision numbers, footer chains, and simulated terminal language. This was not an acceptable interpretation of either Parametric Interface or the repository’s frontend design principles.

The design failed for specific reasons:

- It used the generic AI-dashboard formula: near-black surface, one luminous accent, giant number, miniature chart, and dense technical chrome.
- Labels such as `LIVE`, fake revision identifiers, and ornamental status sequences did not help a participant understand or control the system.
- It imitated the appearance of institutional authority without grounding the interface in an actual user situation or usable convention.
- Borders, colors, typography, graphs, gauges, and badges all competed for attention. There was no disciplined hierarchy or whitespace.
- Four unrelated visual identities made the screens feel like separate mood boards instead of nodes in one relational system.
- It misread `stock/2` by borrowing terminal-like surfaces rather than learning from its information structure and parameter hierarchy.
- Wrapper spectacle overwhelmed the intended subject: how a parameter crosses an edge and changes another screen.
- The designs were aesthetically overdetermined while remaining semantically generic—the characteristic signature of an AI-generated concept dashboard.

Do not repeat this design language in `network-system/macro-economy`. In particular:

- Do not add neon-on-black dashboards, glow, gradients, fake terminal chrome, fake live status, fake revision codes, ornamental gauges, badges, or decorative process footers.
- Do not assign a separate visual theme to every node merely because the institutions have different names.
- Do not use labels that describe an imagined system rather than information a participant needs.
- Do not treat density as rigor or decoration as institutional specificity.
- Do not let a wrapper become more visually salient than the parameter relation it exposes.

The accepted baseline is minimal: one neutral surface, one typographic hierarchy, thin functional rules, one primary parameter, two secondary parameters, and one unembellished history trace. Any later design must justify every additional visual element through interaction or parameter legibility.

The history trace never rescales itself to its recent minimum and maximum. Each
observable has a fixed relative-absolute chart coordinate: Policy Rate `0–6%`,
Net Fiscal Flow `0–6% GDP`, Credit Growth `0–12% YoY`, and Domestic Demand
Growth `0–9% YoY`. The lower graph axis is always the observable value `0`; the
top of the allocated graph row is the declared reference maximum. These are
visual coordinates, not value clamps. Values above the reference maximum draw
outside the SVG row toward the top, and negative values draw below its zero
axis. SVG overflow may cross adjacent UI without changing layout or reflowing
other elements.

The trace's only chromatic encoding is trend: muted green for rising, muted
umber for falling, and graphite for steady. The same encoding is repeated on
the explicit `RISING`, `FALLING`, or `STEADY` label and textual `Δ 1s` value, so
color is never the sole carrier of meaning.

## Perturbation and volatility audit

The model is advanced with an explicit Euler step of `dt = 0.1` seconds. A
pure-model audit, independent of sockets and browser rendering, evaluates the
trajectory after leaving the running regime—not merely numerical stability.

The unperturbed weight-`1.00` system does not converge to a perfectly static
fixed point. After a long warm-up it retains a small endogenous orbit: over a
100-second observation window, the four normalized-state spans are approximately
`0.023–0.035`. It is therefore more accurate to call the starting condition a
quasi-equilibrium than a static equilibrium.

From that running condition, a `+0.55` shock on each node was compared with an
unshocked control trajectory for 30 seconds:

- every shock produced a non-zero displacement in all other three nodes;
- downstream peaks appeared with different delays, approximately `2.1–8.0`
  seconds rather than simultaneously;
- downstream peak magnitudes were approximately `0.046–0.134` in normalized
  state, depending on source and target;
- trajectories repeatedly reversed slope rather than monotonically approaching
  a new value; the tested node traces produced roughly `6–8` slope reversals;
- changing a single directed weight from `1.00` to `3.00` produced materially
  different aggregate variation by edge, rather than a cosmetic line-width
  change. For example, the audited aggregate variation was about `2.39` for
  `Treasury → Central Bank`, `16.26` for `Central Bank → Banks`, and `23.67` for
  `Private Economy → Central Bank` over the same horizon.

This confirms delayed propagation, amplification differences, feedback-driven
reversal, and edge-specific volatility. It does not establish empirical
macroeconomic accuracy: those are properties of the declared four-state signed
system.

Secondary correctness checks confirm:

- all 12 directed weights independently reach their bounds while
  every other direction remains unchanged;
- the implemented next-state values match the declared derivative equation to
  floating-point error `0` in the audit case;
- an adjusted weight remains unchanged after 1,000 ticks;
- removing the node-state hard clamp while retaining `tanh` transfer and
  baseline restoration remains finite in the audited long-run cases, including
  fixed edge weights of `10.00`.

## Change log

### 2026-07-12 — Authoritative system reset

- Added a controller-only reset command handled by the server runtime.
- Reset restores initial node values, weight `1.00`, zero flows, flat histories,
  revision zero, and a new `runId`, then broadcasts immediately to the room.
- Kept the simulation interval, equations, coefficients, interventions, and
  ordinary state broadcast behavior unchanged.
- Changed history maintenance from array reconstruction to in-place fixed-length
  `push`/`shift`; emitted snapshots remain cloned and structurally unchanged.

### 2026-07-12 — Remove node-state hard bounds

- Removed the `[-1, 1]` clamp applied immediately after a node shock.
- Removed the `[-1, 1]` clamp applied after every Euler integration step.
- Observable ranges such as Domestic Demand Growth `[-3, 9]` are therefore no
  longer imposed by the server state model.
- Retained intervention amount normalization `[-1, 1]`, directed edge-weight
  bounds `[0.10, 10.00]`, `tanh` edge transfer, and baseline restoration.
- No presentation, coefficient, socket, or controller changes were included in
  this removal.

## Screen design contract

These rules apply to all four `network-system/macro-economy` screens:

1. Every numbered route renders as a complete full-screen composition on its own. A pane must not depend on the `whole` grid assigning its size.
2. No fixed resolution or aspect ratio is assumed. A screen must compose itself against whatever width and height its current viewport provides.
3. Single and `whole` routes render the exact same wrapper component, DOM, and CSS.
4. On a numbered route, the responsive canvas occupies `100% × 100%` of the current viewport and uses `transform: scale(1)`.
5. In `whole`, each 2×2 cell renders the same canvas at `200% × 200%`. This recreates the dimensions and aspect ratio of the full viewport inside every cell. The canvas is then reduced with `transform: scale(0.5)` from its top-left origin.
6. The `whole` route must therefore look like four full-screen works physically reduced to half width and half height. It must not trigger reflow, alternate breakpoints, condensed layouts, hidden content, or a different relative type scale.
7. Fixed 16:9 canvases, fixed master resolutions, aspect-ratio assumptions, letterboxing, and non-uniform distortion are prohibited.
8. Every wrapper fills its responsive canvas, remains non-scrollable, and keeps all visible content inside it.
9. The 2×2 wrapper owns only placement and the uniform `0.5` transform. It never owns screen typography or internal layout.

## Controller interaction

The controller keeps the four circular positions and six physical straight pairs of `dj/1`, but it exposes the actual 12-edge directed graph and no longer computes system state.

- Every node is split into two explicit sectors: upper `+` injects a positive shock and lower `−` injects a negative shock. Neither sector sets the node’s final parameter value.
- Every physical pair shows both directions simultaneously. Each directional row has its own `− / current weight / +`, and changes to one direction never change its reverse.
- Repeated presses accumulate bounded intervention energy while the server continues ticking between presses.
- All six physical pairs remain straight; each is rendered as two slightly separated straight directional lines with arrowheads. Edge labels and controls are placed at distinct positions along or beside their segments so the two diagonal relationships do not overlap at the center.
- `RESET SYSTEM` sends a reset command to the authoritative server; it never resets only the controller's local view. The button is disabled while its socket is disconnected.

### Reset lifecycle

Reset is atomic within the experiment runtime. It restores the four node states
to their initial values, all 12 directed weights to `1.00`, all edge flows to
zero, all four histories to their initial flat histories, clears the last
intervention, sets revision to zero, and assigns a new `runId`. The room and
socket connections remain intact. Immediately after reset, the server broadcasts
the same fresh snapshot to the controller and every connected screen; the normal
100 ms simulation clock then continues from that state.

Only a socket already joined to `experiment:network-system:macro-economy` with role
`controller` may issue reset. A screen or unjoined socket cannot reset the
runtime.

The controller is also an observer. Node values, 12 directional weights, and 12 abstract directional flows are read from the current server state. The client renders them with a monochrome graph; line width and moving dots are secondary visual mappings, never the meaning of the weight itself. The complete directed graph remains visible without simulated dashboard chrome.

## Socket contract

- Room: `experiment:network-system:macro-economy`
- Events: `network-system-macro-economy:join`, `network-system-macro-economy:hello`, `network-system-macro-economy:presence`, `network-system-macro-economy:state`, `network-system-macro-economy:intervention:in`, `network-system-macro-economy:reset:in`
- The server sends `NetworkSystemSnapshot` state continuously.
- The controller sends `node-shock`, `edge-weight`, or the distinct server reset command.
- Screens never author system state; they receive the current state on join and then observe the ongoing broadcast.
- `network-system/macro-economy` state must remain isolated from `dj/1`, `finger-skating`, and future experiments.

## Main files

- `components/network-system/macro-economy/model.ts`
- `components/network-system/macro-economy/graph.ts`
- `components/network-system/macro-economy/presenter.ts`
- `components/network-system/macro-economy/controller.tsx`
- `components/network-system/macro-economy/screen.tsx`
- `components/network-system/macro-economy/use-network-system-socket.ts`
- `components/network-system/macro-economy/wrappers/registry.ts`
- `components/network-system/macro-economy/wrappers/*.tsx`
- `components/network-system/macro-economy/wrappers/wrappers.module.css`
- `socket/experiments/network-system-macro-economy.mjs`
- `socket/experiments/network-system-macro-economy-model.mjs`
