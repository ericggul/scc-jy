# C-VAL 2 controller — responsive Bloomberg workstation grammar

> Date: 2026-08-10  
> Route: `/c-val/2/controller`  
> Changed variable: large-desktop scale only

## Purpose and boundary

The controller is an observer's workstation for one simulated continuous
double-auction market. It must make the chain from phone conditions to agents,
queues, executions, and resulting price inspectable at once. It is not a
generic dark dashboard and it is not a literal copy of Bloomberg branding or
functions.

The reusable C-VAL wrapper, its code primitives, screen-role profiles, and
adoption limits are defined in the [Bloomberg workstation visual wrapper](./bloomberg-visual-wrapper.md).
This record remains the controller-specific responsive-scale trial.

> **2026-08-11 scope note.** The controller scaling contract in this record is
> retained. Its then-current screen comments about three drums and a physical
> rail are historical only: the active casino and rollercoaster screen
> contracts are now defined in [the Bloomberg screen rebuild record](./2-bloomberg-screen-rebuild-2026-08-11.md).

The current six-area composition is retained:

1. market conditions;
2. price discovery;
3. realized market;
4. agent order flow;
5. market by price;
6. time and sales.

The causal strip across the top remains the reading order:
`market conditions → agent decisions → price formation → realized market`.
The screen shows only one bounded C-VAL market. It must not acquire securities,
portfolios, headlines, alerts, timestamps, keyboard mnemonics, or other
financial-terminal fiction merely to appear denser.

## Evidence reviewed

- The user-authorized Chrome capture of the C-VAL controller at 1467 × 750 CSS
  px is the baseline visual field. Its 12 px root type, six areas, and current
  relative geometry are the laptop invariant.
- `/stock/3` is the accepted local reference for terminal density, readable
  tabular type, semantic colour, and responsive record retention. Its
  preservation document is [`stock/3`](../../scc/docs/experiments/dashboard/stock/3.md).
- `/stock/4` is a hover-decomposition variation of that accepted workstation.
  Only its resting terminal frame is relevant here; its image replacement is
  not a controller precedent. See [`stock/4`](../../scc/docs/experiments/dashboard/stock/4.md).
- Bloomberg's own Terminal material describes a customizable Launchpad with
  linked monitors, alerting, charting, news, and multi-asset observation; the
  image is useful as a workstation reference, not as an element inventory.
  [Bloomberg Terminal](https://professional.bloomberg.com/products/bloomberg-terminal/),
  [official Launchpad image](https://assets.bbhub.io/company/sites/51/2022/05/LaunchPad-768x432.png).

These sources support the workstation premise. They do not establish that a
particular pixel colour, font, or panel arrangement is a proprietary Bloomberg
rule; the decisions below are local C-VAL design rules.

## What “Bloomberg aesthetic” means here

It means a working grammar for rapid comparison, not `black + orange` styling.

| Rule | C-VAL controller expression |
| --- | --- |
| Context stays visible while evidence is inspected | conditions, price, outcomes, orders, queues, and executions are simultaneous rather than drilled into separate views |
| Each visual form has an observation job | traces show history; tables show chronological records; depth bars show resting quantity; green/red show market side or direction |
| Reading is columnar and repeatable | labels left-align, values right-align, all changing numbers use tabular numerals, and section headers are compact |
| Density comes from real state | 16 bounded recent orders, nine asks, nine bids, 12 trades, summaries, and histories; no duplicated filler cells |
| Structure is quiet | flat dark planes, one-pixel functional rules, square corners, no glow, glass, gradient, hero space, ornamental status badge, or rounded-card collection |
| Interaction is command-like only where it actually acts | recording commands and reset are real controller actions; no fake navigation or terminal command prompt is added |

The controller's information ontology is more important than its surface:

```text
exogenous conditions
  → participant intent
  → FIFO resting supply and matching
  → execution-derived price
  → measured market outcomes
```

Any future controller change must preserve that order and distinguish input
conditions from realized outcomes. A chart, colour, or panel may be removed
when it no longer makes that relation clearer; it must not be retained as
terminal decoration.

## Palette and typography

| Token / role | Value and constraint |
| --- | --- |
| working ground | `#030403`; panel surface `#070907`; raised functional header `#242722` |
| structure | `#353A34` / `#565B53` rules; rules separate real record groups and do not form ornamental card chrome |
| primary text | warm off-white `#E6E5DD`; secondary and low-priority information reduces contrast before it reduces size |
| functional hierarchy | amber `#F0A000` for section titles, active functional codes, V, and the inside-market spread plate |
| positive / bid | green `#20BD68`, only for positive moves, buy sides, and bid-side depth |
| negative / ask | red `#E94A58`, only for negative moves, sell sides, and ask-side depth |
| liquidity / supply identity | cyan `#45ACC7`, used for L and participant/resting-supply labels |
| type | tabular SF Mono/Menlo-class mono for records; neutral sans only for headings and the primary executed price |

Amber is not a highlight sprayed across controls. Green, red, and cyan are not
competing themes. A value receives colour only when its market role is
different without its label.

The operational type floor is 10 px at the 1467 × 750 reference. Record rows,
book levels, and trade rows are 11 px. Never preserve density by horizontal
glyph compression, distorted line-height, or shrinking text below that floor.

## Large-desktop responsive rule

The former controller filled a larger viewport while retaining 12 px root type,
25 px panel headers, and fixed-size row mechanics. The data area became larger
but the information field did not, so the workstation looked thin rather than
proportionally enlarged.

`controller.module.css` now establishes the 1467 × 750 laptop field as the
reference. Its root font size is the larger of 12 px and the smaller of the
corresponding width and height ratios. All wide-workstation operational sizes
are expressed from that root: top chrome, causal strip, headers, minimum
columns, rows, table type, ladder centre, execution summary, and gaps grow as
one unit.

Consequences:

- At 1467 × 750 and similar/smaller laptop viewports, the scale remains 1 and
  the existing visual appearance is preserved.
- When both dimensions increase, type, panel apparatus, table rows, and
  minimum columns increase together instead of leaving larger empty cells
  around fixed 10–12 px text.
- The smaller dimension controls growth, so an ultrawide display with laptop
  height does not create vertically overflowing oversized type.
- The existing `≤1240 px` two-column and `≤760 px` one-column responsive
  contracts are unchanged. Those layouts intentionally preserve the 12 px
  floor and use reflow rather than scale-down.

Large-monitor scale does not authorize a different grid, wider borders,
extra panels, or more decorative charts. It only preserves the accepted
information-to-screen proportion.

## Time, motion, and update discipline

The server publishes abstract market state on its existing 50 ms runtime tick.
The controller may redraw the current snapshot at that cadence, but it must not
turn data arrival into a spectacle:

- no artificial scan line, glow pulse, number-counting tween, parallax, or
  panel entrance animation;
- price, histories, depth widths, and buy/sell distribution remain direct
  browser-derived readings of current state;
- line history is an irregular record of executions, not a decorative wave;
- reduced-motion preference keeps the controller free of nonessential motion.

Speed on the surrounding screens is role-specific rather than a terminal skin:

- the rollercoaster keeps its executed-price-to-rail relation and its sparse
  physical scene; it may share gain/loss semantic colour but must not gain
  controller panels or terminal labels;
- the news screen is a separately bounded Bloomberg-news wire trial: distinct
  editorial stories derived from material market-state transitions accumulate
  in one newest-first 54-record log across two continuous columns. Raw trades,
  orders, depth, and spread are internal evidence only, never headlines. Its rejected
  card/lead, red-chrome, fixed-topic, and history-filler trials are recorded in
  [`2-news-bloomberg-migration-2026-08-10.md`](./2-news-bloomberg-migration-2026-08-10.md);
- the media screen remains a black canvas whose tile count/direction derives
  from execution-price change; it must not invent market analytics;
- the casino retains its three-drum, execution-price representation and its
  mechanical visual language; terminal density is not a reason to reskin it;
- the mobile route remains immediate feedback for the sole physical input, not
  a condensed controller or a second parameter-control surface.

This is a shared semantic family, not a mandate to make every screen look like
the controller. The multi-device relation is the artwork; a homogeneous
terminal costume would erase each screen's actual perceptual task.

## Regression checklist

Before changing this controller, verify:

- the wide layout still contains the six named areas and their existing
  staggered geometry;
- all 16 order rows, 18 book levels, and 12 trade rows remain legible without
  internal scrolling at the reference desktop;
- the laptop root remains 12 px, utilities remain at least 10 px, and wide
  screens scale both text and row apparatus together;
- semantic colours still encode only V/function, liquidity/supply, bid/buy,
  ask/sell, and positive/negative change;
- no screen family receives terminal chrome solely because it shares the C-VAL
  socket snapshot;
- no browser-derived visual state is moved into the socket protocol.

This record is a bounded responsive-scale trial. It retains the prior controller
composition and leaves the C-VAL market model, socket contract, input mapping,
mobile, and surrounding screens unchanged.
