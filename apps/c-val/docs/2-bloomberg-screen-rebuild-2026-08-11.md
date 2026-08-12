# C-VAL 2 casino + rollercoaster — Bloomberg screen rebuild

> **Superseded active composition.** The execution-monitor and
> trajectory-monitor composition below failed review because it duplicated the
> controller and erased the casino/rollercoaster functions. The accepted
> replacement constraints are in
> [the reconsideration record](./2-casino-rollercoaster-reconsideration-2026-08-11.md).

> Date: 2026-08-11  
> Routes: `/c-val/2/screen/casino`, `/c-val/2/screen/rollercoaster`  
> Preserved historical source: `components/c-val/2/screen-legacy/`
> (the former direct `*-legacy` routes were deregistered on 2026-08-11)

## Why this rebuild exists

The former active casino reduced a real execution price to three theatrical
number drums. The former active rollercoaster turned a 28-sample price path
into a rendered rail and train. Both used truthful inputs, but neither gave an
observer Bloomberg-like simultaneous evidence: there was no stable price
context, no ordered record field, no comparison between current state and its
immediate causes, and too much of the display's surface was occupied by the
metaphor itself.

The user explicitly requested a complete replacement of those approaches. This
is not a visual restyle of the cabinet or the 3D scene. Their historical
function is retained, while their visual grammar is retired:

| Route | Retained function | Retired representation | New observer question |
| --- | --- | --- | --- |
| casino | make the newest executed price and its immediate change perceptible | slot cabinet, reels, chassis, simulated mechanical spin | What executed, at what price, against which bid/ask and recent run? |
| rollercoaster | make ascent, descent, reversal, and short-horizon instability perceptible | physical rail, vehicle, studio environment, autonomous render loop | How did the last 28 executed price samples form this path and where did it reverse? |

The two legacy routes remain untouched evidence of the previous physical
instrument trials. This active replacement must not import their markup, CSS,
assets, reel motion, Three.js scene, or presentation logic.

## C-VAL definition of the Bloomberg aesthetic

This is a **reading grammar for consequential, changing records**, not a dark
theme and not a claim to reproduce Bloomberg's proprietary interface.

1. **A screen has one operational question.** Its header names a genuine data
   function. A value, chart, table, or rule appears only if it helps answer
   that question.
2. **Context stays beside the current reading.** A reader must not leave the
   screen to distinguish last price from open, one-day move, range, liquidity,
   recent execution, or prior samples.
3. **Density comes from complete, non-duplicated evidence.** Rows are ordered,
   aligned, and bounded. It is never smaller type, filler metadata, arbitrary
   panels, or repeated values in different decorative forms.
4. **Placement is stable.** Values occupy fixed columns, histories proceed in
   chronological order, and a refresh changes a record's contents rather than
   re-orienting the whole field. This permits fast peripheral scanning.
5. **Colour has a narrow semantic job.** Amber identifies the function and the
   reader's entry point; green/red denote positive/negative movement and
   bid/ask sides; cyan identifies resting liquidity. Warm off-white is the
   normal data colour. No glow, gradient, pulse, or coloured surface is used as
   atmosphere.
6. **Motion is evidence.** A changed line, updated depth fill, and appended
   execution are sufficient. No count-up, scrolling ticker, reel turn, camera
   movement, entrance animation, or ambient render may create a rate the
   market did not provide.
7. **Compact type remains readable.** Mono figures are tabular and
   right-aligned; concise functional labels use the C-VAL sans face. At the
   controller reference field, body rows are about 11–12 px. All type, header
   heights, row heights, and gaps share the same container-derived scale.

The practical test is not whether the palette looks financial. Remove every
label: the screen should still visibly contain a price reading, an aligned
history, comparable market records, and a clear current-versus-context
hierarchy. Replace C-VAL with another subject and the data contracts would no
longer make sense; that is why this is a justified workstation rather than a
terminal costume.

## Shared system rules

Both replacements use `CValBloombergWorkstationFrame` and its existing C-VAL
tokens. They retain only browser-derived presentation; the socket continues to
send abstract C-VAL snapshots.

```text
short function strip                 identifies the observation function
current context band                 last price + immediately comparable facts
primary evidence pane                one real changing data representation
ordered record panes                 the complete supporting record sets
```

- The top strip is a functional locator, not a fake command line, source,
  alert, clock, connection badge, or external market claim.
- Rules divide genuinely different record sets; there are no rounded cards,
  decorative section bars, gradients, shadows, or ornamental microcharts.
- Waiting state reports the actual absence of executions. It never fabricates
  a tape, a book, or a prior market.
- At a wide full-screen field, both routes fit without page scrolling. At
  constrained sizes they reflow into a deliberate vertical reading order and
  retain every underlying row; a compact table may scroll horizontally only
  when columns cannot be truthfully removed.

## Casino: execution monitor contract

The route's sole task is immediate price discovery. It does not simulate a
game, prize, probability, balance, wager, or market participant.

```text
┌ FUNCTION / EXECUTION MONITOR ──────────────────────────────────────┐
├ LAST EXECUTION + OPEN / 1D MOVE / HIGH / LOW / RANGE ──────────────┤
├ PRICE TRACE (actual history) ───────┬ EXECUTION TAPE (12 trades) ──┤
├ 5 bid levels / 5 ask levels ────────┼ CURRENT MARKET FACTS ───────┤
└─────────────────────────────────────┴──────────────────────────────┘
```

- **Primary parameter:** `market.index`, the latest executed price.
- **Context:** `openingPrice`, `oneSecondMovePercent`, one-second high/low,
  range, bid, ask, depth, spread, turnover, realized volatility, and actual
  snapshot history.
- **Evidence budgets:** one price trace, up to 12 real `recentTrades`, five
  bid levels, five ask levels, and eight distinct current facts. Empty source
  records render as explicit absence, not invented rows.
- **Update discipline:** the trace changes only with snapshot history; a tape
  row is an actual trade object keyed by its stable trade ID; book quantities
  update in place.

## Rollercoaster: trajectory monitor contract

The route retains the former rollercoaster's temporal function but removes the
physical metaphor. It reads the contiguous 28-point execution window as a
terminal trajectory field. There is no generic chart dashboard: its complete
record set is specifically the ordered short price path.

```text
┌ FUNCTION / EXECUTION TRAJECTORY ───────────────────────────────────┐
├ LAST PATH STATE + 1D MOVE / WINDOW HIGH / LOW / RANGE ─────────────┤
├ 28-POINT PRICE PATH ────────────────┬ PATH SUMMARY ────────────────┤
├ WINDOW 01–14: price / step / status ┼ WINDOW 15–28: price / step ──┤
└─────────────────────────────────────┴──────────────────────────────┘
```

- **Primary parameter:** the same 28 ordered values from
  `cValRollercoasterPrices`; its final point is always `market.index`.
- **Context:** first and last path prices, window high/low/range, one-day move,
  from-open move, realized volatility, depth, and the actual V/A/L conditions.
- **Evidence budgets:** every one of the 28 values appears once in the line and
  once as an aligned chronological record, split into two 14-row fields. Each
  record shows price, change from its predecessor, and direction. There is no
  smoothed or fabricated path.
- **Update discipline:** the path polyline receives the real history points;
  no camera, vehicle, environmental colour wash, or autonomous animation
  remains. The final record changes because the executed price changes.

## Responsive and performance contract

The root size derives from the same container that constrains the panel field.
All local geometry uses `em`, not fixed independent pixel dimensions. This
preserves the accepted 13-inch field's density and scales both rows and type on
larger displays.

- Wide: two principal columns with a compact context strip and all record
  budgets visible.
- Mid-width: evidence panels stay paired where possible; history/record panes
  become full-width only when their actual rows still fit.
- Narrow: the order is current context, primary evidence, then records; no
  values are silently removed or globally shrunk below their role floor.
- No timed React state loop exists. A snapshot derives a bounded set of stable
  records once; CSS handles non-semantic paint changes. The only retained chart
  work is an SVG path generated from the supplied history.

## Graphs: 10 × 10 market matrix contract

`/c-val/2/screen/graphs` is a single full-screen observation field, not a
collection of miniature dashboard cards. It keeps the Bloomberg small-multiple
grammar: same chart treatment, fixed grid position, terse channel code,
tabular end value, and semantic line colour across all one hundred cells.

```text
  columns:  PX   OP%  RET  MOM  ACC   V    A    L   RVOL DEPTH
  rows:     chronological windows 01 … 10, each containing 12 observations
```

The matrix uses the latest 120 actual snapshots exactly once per channel,
partitioned into ten adjacent chronological 12-observation windows. It does
not invent one hundred companies, prices, or histories.

| Channel | Source or explicit derivation |
| --- | --- |
| `PX` | executed `history.index`, ending at current `market.index` |
| `OP%` | each actual price relative to the actual opening price |
| `RET` | `history.returnPercent` |
| `MOM` | one-sample price return |
| `ACC` | change in that one-sample return |
| `V` / `A` / `L` | history of the three actual market conditions |
| `RVOL` | `history.realizedVolatilityBps` |
| `DEPTH` | `history.depth` |

Each bounded cell owns one equally treated SVG path; there are no timer loops,
canvases, independently scheduled graph components, or autonomous data source.
Every new shared snapshot updates the same matrix through its real input
history. Price direction uses green/red; liquidity and depth use cyan;
condition and volatility fields use amber. At constrained widths the exact
10×10 grid stays intact inside deliberate local inspection rather than being
reduced to fewer graphs or unreadable hidden records.

## Review criteria

Reject the rebuild if casino or trajectory contains a cabinet, reel, train,
physical rail, 3D scene, decorative ambience, generic KPI card, fake market
source, fake timestamp, `LIVE` badge, ornamental status light, or a duplicated
metric. Reject the graph matrix if any chart is a sine wave, random series,
invented security, or independently timed animation. Approve only after a
screenshot shows compact, occupied, readable fields at the 13-inch reference
and proportionally enlarged rows/type on a larger field.
