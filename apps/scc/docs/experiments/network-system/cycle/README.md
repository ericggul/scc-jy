# Network System / Cycle

## System meaning

Cycle is an independent network macroeconomy. The node-edge system is the
primary work; the beef/diving pair is one major derived output of that system.
It is not bound directly to one arbitrary node and it does not use the old
`PRIVATE ECONOMY` coordinate.

The causal chain is:

`directed edge weights → nine-node economic dynamics → production path → annual GDP growth → video count / headline feed`

The original `network-system/macro-economy` model, UI, socket events, room, and
runtime are unchanged.

## Economic network

Cycle owns nine endogenous nodes:

1. household demand
2. production
3. inventories
4. employment
5. wage share
6. investment
7. credit
8. inflation
9. policy rate

It owns 22 independently adjustable directed edges. Positive channels are
solid and negative channels are dashed. Examples include demand → production,
production → employment, employment → wages, credit → investment,
inventories → production (negative), inflation → demand (negative), and policy
rate → credit/investment (negative).

Nodes are read-only in the controller. Each edge has its own `− / value / +`
control placed directly on the graph. A click changes only that edge by `0.5`.
Weights range from `0` to `20`; zero removes a channel. The former `3.0` ceiling
does not apply.

The model combines node-specific adjustment delays, an explicit inventory
balance, delayed monetary-policy feedback, and nonlinear credit risk. With
weak/zero propagation it decays toward equilibrium. The default calibration
produces a bounded persistent cycle. Strong inventory or policy feedback can
produce abnormal boom-bust motion. A numerical safety fuse exists only at an
internal state magnitude of `100`, far outside the normal range; it does not
cap GDP growth at 3%.

One real second represents one simulated quarter. The server advances the model
every 100 ms with `dt = 0.025` simulated years.

## GDP derivation

`production` is the model's real-output gap. It is converted into a positive
output index:

`outputLevel = 100 × exp(0.08 × production)`

Annualized model GDP growth compares the current output with the output from
four real seconds earlier (four simulated quarters):

`gdpGrowth = 100 × [ln(outputNow) − ln(outputFourSecondsAgo)]`

There is no manually selected boom/recession regime, random display state,
moving average, or fixed 3% boundary. The sign and magnitude come from the
network's production history on every snapshot. Model tests confirm that strong
edge settings can produce approximately `−62%` to `+62%` GDP growth without
numerical failure.

## GDP to video count and dynamic N

- `gdpGrowth > 0`: beef/left only.
- `gdpGrowth < 0`: diving/right only.
- `gdpGrowth = 0`: both sides zero.
- `activeCount = ceil(abs(gdpGrowth))`.

The exact mapping is therefore:

- `+0.01%` → left 1, right 0
- `+0.30%` → left 1, right 0
- `+1.50%` → left 2, right 0
- `+50%` → left 50, right 0
- `−0.01%` → left 0, right 1
- `−0.30%` → left 0, right 1
- `−1.50%` → left 0, right 2
- `−60%` → left 0, right 60

Each side derives its grid independently from its current count:
`N = ceil(sqrt(currentVideoCount))`. N grows and shrinks on every snapshot.
For example, 60 right videos produce a 8×8 right grid; 2 left videos produce a
2×2 left grid.

Both sides fill from the top-left in row-major order. A pane still decodes only
one video. Changing N resizes only its canvas/grid; it never reloads the source
video or restarts its active loop segment. The current frame is drawn once into
a tile and filled across contiguous active runs, avoiding one video decoder or
one `drawImage` call per cell.

## Routes and socket isolation

- `/network-system/cycle/controller`
- `/network-system/cycle/screen/news`
- `/network-system/cycle/screen/employment`
- `/network-system/cycle/screen/employment-2`
- `/network-system/cycle/screen/graphs`
- `/network-system/cycle/screen/graphs-2`
- `/network-system/cycle/screen/left`
- `/network-system/cycle/screen/right`
- `/network-system/cycle/screen/whole`

`news` is one of the non-video Cycle screens. It is a full-height stack of
moving headline rows, not a conventional news page: no masthead, cards, source
labels, timestamps, or market chrome. It derives all nine model sectors directly
from each abstract Cycle snapshot. Each sector owns fifty pre-written English
economic-daily headline templates: ten each for surging, rising, steady, falling,
and plunging conditions (450 total). The presenter calculates the recent
percentage change for each sector, resolves the matching template's
`{{pct}}` value, and rotates only within that sector, regime, and visible
percentage reading. The screen fits 10–20 rows from the available viewport
height. The rows have no outer vertical padding, so the first and final rows
meet the top and bottom viewport edges. A row is a lane of three independent,
immutable news items rather than two copies of one row-level headline. Existing
items are never rewritten while visible. The browser removes an item only after
it has completely crossed the left edge, then appends one headline derived from
the latest snapshot to the far right of that lane. New copy therefore enters
through normal horizontal motion instead of replacing text already on screen.
Natural headline widths plus responsive padding keep consecutive items visually
separate. All visible rows use the same fully opaque text color; economic
intensity affects motion rather than legibility. Every lane is permanently
assigned one of the nine Cycle node IDs, repeated in node order when the
viewport needs more than nine rows. On every animation frame, a lane reads only
the absolute current socket value of its assigned Cycle node. Speed is linearly
proportional at 500 pixels per second for each absolute model unit: 0.1 moves at
50px/s, 0.4 at 200px/s, and 1.0 at 500px/s. Percentage momentum, snapshot
derivatives, combined activity, and shock acceleration do not affect movement.
Only magnitudes below 0.04 use a 20px/s movement floor so a quiet lane does not
become permanently immobile. Each lane owns its current velocity and
exponentially approaches its own live target, so rows accelerate and decelerate
independently as their absolute node values change.
Motion never becomes zero, and the short three-item buffer allows newly appended socket
headlines to reach the viewport without waiting behind twelve stale items. A
socket revision may replace only the lane's final item while that item remains
entirely beyond the right viewport edge; once any part enters the viewport it
becomes immutable. The incoming item's complete text reserves its final width
while invisible. When its left edge reaches the right viewport boundary, that
item remains blank until it reaches exactly 80% of the viewport width—the
rightmost one-fifth boundary. Each lane predicts its next-frame displacement
from its own current speed and schedules the transition immediately before
crossing that shared boundary, preventing fast rows from visibly overshooting
the start point. Typing is spatial rather than time-based: every frame maps the
item's position across the 80%–75% viewport interval to its completed character
count. The item therefore starts empty at the rightmost one-fifth boundary and
is guaranteed to show its complete headline at the rightmost one-quarter
boundary, regardless of its row speed.
This browser-side presenter is modular and does not add presentation state to
the socket server. `whole` contains only the equal-width left/right video panes.

`employment` is a second independent non-video screen. It shows a fixed field
of 112 family glyphs in an 8×14 portrait grid (transposed to 14×8 in landscape).
It binds directly and only to the fourth Cycle node, `employment`. The browser
uses the current absolute model state from every snapshot, with the model's
initial `0.03` state as the normal baseline. A value at or above that baseline
leaves every family happy. A lower current value changes families into a
laid-off, crying state in row-major order:

`distressedCount = ceil(clamp((0.03 − currentEmployment) / 0.58, 0, 1) × 112)`

`0.03` or higher means exactly zero distressed families; `−0.26` means 56;
`−0.55` or lower fills the field. Recovery returns the same stable family slots
to their happy state. This mapping is presentation logic only and does not
change the Cycle socket payload.

The employment screen's participant observes families as the network moves.
Its primary parameter is the employment drawdown, and its perceptual job is to
make job loss and recovery immediately countable without a metric dashboard.
There is no direct interaction on this screen; controller edge changes remain
the cause. The neutral surface, black glyphs, typography-free field, and short
state transition keep it in the same restrained system family as the news and
video outputs. Removing the grid or the two family states would remove the
employment relation; labels, badges, legends, borders, and decorative status
elements are intentionally absent.

`graphs` observes all nine current Cycle node values in one responsive 3×3
field. It follows the established `macro-economy/whole` family: one dark stage,
nine equal neutral panes, shared type and semantic trend colors, and graphics
that scale from each pane's own container. Each pane contains only its full node
name, current absolute model value, centered zero reference, and the latest 96
history samples plus the newest 100ms snapshot value. Its vertical domain is
symmetrical around zero and independently expands to contain that node's recent
extremes, including abnormal values. The participant's perceptual job is to see
phase, sign, amplitude, and propagation across the nine-node network at once;
there is no interaction or presentation state on the server. Removing labels,
current values, zero references, or traces would reduce that comparison; other
dashboard furniture is intentionally absent. `whole` remains the existing
left/right video composition and is not changed by this route.

`employment-2` replaces the family illustration with a 40×40 field of 1,600
native 🙂 and 😢 emoji. It uses the current `employment` node directly and is
balanced at zero: 800 smile and 800 cry. Positive employment converts crying
faces to smiles; negative employment converts smiles to crying faces. The
display reaches all smiles at `+2.00` and all crying at `−2.00`, keeping the
normal default oscillation within a partial, legible range. It does
not mount 1,600 React elements. The browser rasterizes each emoji once into an
offscreen canvas, draws the full field on resize, and redraws only the slots
whose state changed. Every 100ms snapshot is reflected immediately with no
rate limiter, delay, moving average, or history window. At `0` exactly 800 cry;
at `+0.50` 600 cry; at `−0.50` 1,000 cry. The
40×40 field sits in a centered `min(100vw, 100vh)` square: horizontal displays
therefore use a centered `100vh × 100vh` field instead of stretching emojis
across the viewport. The surrounding surface uses the same warm-white color as
the field, with no black background.

`graphs-2` preserves the same nine nodes, current snapshot cadence, history,
and controller-spatial 3×3 order as v1 while applying the functional grammar
of `stock/2`: compact fixed-width numbers, stable panel alignment, orange series
codes, cyan traces, semantic one-second changes, readable period high/low rows,
and a chart-dominant panel proportion. Its terminal shell now follows the same
operational hierarchy: menu/reset-selection control, loaded monitor label,
functional series command field and GO action, nine-series quote ribbon, actual
history range/interval toolbar, selectable panels, and the 3×3 chart field. It
contains no connection state or snapshot label. Each internal node is translated into a recognizable economic
observable: household consumption growth, industrial production growth,
business inventories growth, hourly earnings growth, payroll employment
growth, business fixed investment growth, CPI inflation, policy interest rate,
and private credit growth. This wrapper is justified because the participant's
task is dense simultaneous comparison of nine economic series, not because the
subject merely suggests a terminal. Removing current value, change, history,
or high/low range would reduce that comparison; command inputs, fake sessions,
news, badges, and unrelated terminal functions are intentionally absent.

Cycle uses room `experiment:network-system:cycle`; every event begins with
`network-system-cycle:`. It imports only the Cycle model and never the original
macro-economy model.

## Component boundaries

Cycle keeps abstract state in `model/`, the browser socket boundary in
`transport/`, controller graph interaction in `controller/`, video code in
`media/`, the headline feed in `news/`, the family field in `employment/`, the
emoji field in `employment/emoji/`, both nine-node trace fields in `graphs/`,
and route-facing screen composition in
`screen/`. This leaves each device and media concern independently
replaceable without changing public routes.

## Video contract

- Left/beef: `/video/left.mp4`, loop `5–15s`.
- Right/diving: `/video/right.mp4`, loop `65–74s`.
- Grid: responsive, independently dynamic N×N inside each pane, with no
  `vw`/`vh` cell sizing.
- One preloaded source video is decoded per pane and copied to canvas cells, so
  increasing N does not create N² network requests or video decoders.
- A side restarts from its configured segment start whenever it changes from
  zero active cells to active again.
- Video is audible while its side is active and silent while inactive.
