# C-VAL 2 casino + rollercoaster — second active-route rejection and replacement contract

> Date: 2026-08-11
> Active routes: `/c-val/2/screen/casino`, `/c-val/2/screen/rollercoaster`
> Changed variable: the primary representation, not the C-VAL market, input,
> socket, or its historical source records.

## Rejected active pass

The first Bloomberg migration replaced casino with an **execution monitor** and
rollercoaster with an **execution trajectory monitor**. Browser review showed
that this was not an aesthetic refinement but a category mistake.

- It copied the controller's job: quote context, execution tape, order book,
  outcome facts, line chart, and a small chronological table.
- It therefore erased the actual perceptual functions that made either screen
  necessary: a casino's discrete, uncertain settling of a number and a
  rollercoaster's embodied continuous climb, drop, and carried current point.
- Its small default type, large empty chart areas, sparse record budgets, and
  static-looking updates failed the 13-inch reference field. A terminal palette
  did not compensate for the missing screen-specific instrument.

This pass is rejected. It must not be incrementally polished or used as a
layout reference.

## Rejected implementation drift

The first replacement implementation also drifted away from the approved
instrument contracts during iterative work. Screenshots made the failures
plain: the casino accumulated explanatory monitor copy, split its actual
results into columns too narrow to read, and placed the decimal as a detached
ornament; the rollercoaster acquired braced structures, labels beneath the
track, and vehicle-like train details. These are rejected, even though the
underlying price data was real.

- Casino keeps one readable 24-row result ledger, a five-drum register, a
  structural decimal after drum three, a slim actual-fact field, and a compact
  complete outcome run. It has no page title, payout language, invented
  signals, or duplicate explanatory headers.
- Rollercoaster keeps two rails and one thin vertical support directly below
  every actual price point. There are no frames, feet, braces, labels, or
  numbers below a support. The carried object is only a short linked row of
  open coaster seats on the final rail segment—not an automobile, icon, 3D
  scene, or illustrated ride.
- Every screen revision is judged from an actual route capture before it is
  retained. Static type checking is necessary but cannot approve geometry,
  density, legibility, or a physical metaphor.

## Bloomberg rule actually retained

Bloomberg is not a generic collection of dark panels. A specific functional
screen gives its principal instrument most of the field, while aligned data
around it answers the question that instrument poses. The shared rules are:

1. **One proprietary C-VAL function per route.** The controller remains the
   only complete market-inspection surface. Neither replacement repeats its
   book, tape, participant, or causal-market panels.
2. **One dominant data geometry.** The geometry is not decorative: it owns the
   actual market value that is changing, and every visible secondary record
   explains either its preceding changes or its current velocity.
3. **Tight readable type, not shrunken type.** At the 1467 × 750 laptop field,
   root terminal type is approximately 15 px; headers and records scale from
   that same enclosing pane on a larger display.
4. **Density is a complete sequence.** A panel may be dense only with distinct
   actual records: every casino result or every ride waypoint, never repeated
   controller metrics or filler labels.
5. **Motion exposes rate.** Update cadence derives from actual execution
   timestamps and one-second movement. CSS may interpolate the position of an
   updated instrument, but there is no autonomous timer, random sequence,
   fake trade, or ambient animation.
6. **Narrow colour semantics.** Amber is the selected instrument/result,
   green and red are up/down outcomes, cyan identifies the carried/current
   trajectory point, and off-white is settled data. There is no neon aura,
   gradient, game skin, fake odds, payout, account, or `LIVE` fiction.

## Flat raw surface invariant

The user later selected the accidental raw browser rendering as the visual
baseline for the current `casino`, `rollercoaster`, `graphs`, and `raw` screen
trial. The conclusion is precise: the useful quality was not broken CSS, but
the absence of terminal costume.

- These routes render no top `C-VAL` brand bar, command/function strip, red
  status field, raised card, rounded container, or decorative frame.
- The black field begins with its data. Local labels identify actual data sets,
  not the product or a dashboard mode.
- Structural lines appear only when they are the instrument: the casino's
  settlement axis, the rollercoaster's two rails and sleepers, or the actual
  data line in a graph. Repeated row borders and panel boxes are removed.
- The dedicated `/c-val/2/screen/raw` route preserves literal browser-default
  text flow as an independent reference screen. It is not a fallback or an
  approximation of the casino layout.
- The controller and the established news wire have different reviewed tasks
  and are intentionally excluded from this surface change.

This invariant applies after each route's distinct information geometry is
proven. It does not authorize collapsing casino, rollercoaster, the news wire,
or the 100-graph matrix into one generic screen.

## Casino replacement: settled price register

- **Participant situation:** A visitor watches rapid, phone-driven executions
  settle one exact price after another. The interest is the irreversible
  instant in which the moving market becomes a displayed number.
- **Primary parameter:** the latest `market.index` split into its five actual
  price digits.
- **Perceptual job:** see the current price as five adjacent mechanical number
  positions, see which digit changed, and compare the result with its recent
  sequence and actual execution cadence.
- **Function retained from casino:** discrete number drums, a centre settling
  line, adjacent-before/after values, and a rapid run of results. These are
  data geometry, not a casino illustration.
- **Bloomberg composition:** a five-column price register occupies the centre.
  The left field is one readable 24-result actual ledger; the right field is a
  compact actual cadence/change field. A full-width lower sequence holds 24
  ordered price outcomes with sequence, price, and step. The price has no
  product header or caption: the five drums and their settlement line are the
  instrument.
- **Removal test:** remove the drum matrix and the screen becomes an ordinary
  controller quote page; remove the historical outcomes and it loses its
  casino function. Remove any invented wager, payout, player, odds, cabinet,
  or reel artwork and no real data is lost—therefore none is rendered.

## Rollercoaster replacement: carried execution track

- **Participant situation:** A visitor sees the last 28 phone-driven price
  executions as the track currently carrying a marker through ascent, drop,
  flat run, and reversal.
- **Primary parameter:** the contiguous 28-point `history.index` window ending
  in `market.index`.
- **Perceptual job:** read the actual temporal path as a literal two-rail
  trajectory, locate the carried current point, and identify the sequence of
  climbs, drops, and reversals without confusing it with the controller's
  price chart.
- **Function retained from rollercoaster:** two rails, perpendicular sleepers,
  a small last-price carriage angled to the final segment, and a record of
  consecutive terrain segments. Each is calculated from actual price points.
- **Bloomberg composition:** the track spans the upper field and contains all
  actual waypoints as two rails with one vertical post below each. The lower
  field is a 28-record price/step ledger, accompanied by compact actual motion
  facts. The current execution is carried by a minimal linked train of seats
  anchored on the final segment. It contains neither order book nor
  time-and-sales view.
- **Removal test:** remove the rails, sleepers, or carried marker and the
  continuous physical price-path relation is lost; remove 3D scenery, a train
  model, sky, crowd, camera, or autonomous render loop and no C-VAL relation
  is lost—therefore none is rendered.

## Responsive and performance constraints

The active screen remains one fixed 13-inch installation field at its reference
size and grows every row, rule, digit, and label together on larger displays.
On narrow fields it becomes a deliberate vertical instrument reading order;
it never silently removes outcomes or waypoints. One snapshot creates bounded
presentations. No React interval, random data, sine path, or repeated layout
measurement is permitted. Casino and rollercoaster use only a GPU CSS
transition on the changed reel or carried train, with duration derived from
the new actual record cadence. The graph matrix is the one narrow exception:
one capped 30 fps canvas loop interpolates 100 actual histories, with no
per-cell timers, React frame updates, or per-frame data allocation.
