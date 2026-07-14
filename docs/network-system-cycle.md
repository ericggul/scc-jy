# Network System / Cycle

## System meaning

Cycle is an independent network macroeconomy. The node-edge system is the
primary work; the beef/diving pair is one major derived output of that system.
It is not bound directly to one arbitrary node and it does not use the old
`PRIVATE ECONOMY` coordinate.

The causal chain is:

`directed edge weights → nine-node economic dynamics → production path → annual GDP growth → video count`

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

- `/network-system/controller/cycle`
- `/network-system/screen/cycle/1`–`4`
- `/network-system/screen/cycle/left`
- `/network-system/screen/cycle/right`
- `/network-system/screen/cycle/whole`

Numbered screens show four key network observables (demand, production, credit,
inflation) and the shared GDP result. `whole` contains only the equal-width
left/right video panes.

Cycle uses room `experiment:network-system:cycle`; every event begins with
`network-system-cycle:`. It imports only the Cycle model and never the original
macro-economy model.

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
