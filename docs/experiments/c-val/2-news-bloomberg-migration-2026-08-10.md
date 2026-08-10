# C-VAL 2 news migration — rejected first trial, 2026-08-10

> Route: `/c-val/2/screen/news`  
> Status: **rejected before acceptance**  
> Preserved baseline: `components/c-val/2/screen-legacy/news/`

## Non-negotiable task contract — user instruction, 2026-08-10

This section is the operational memory for this migration. It overrides every
earlier implementation description in this document that conflicts with it.

1. Change only the active `components/c-val/2/screen/news` renderer. Preserve
   `screen-legacy` as the historical baseline; do not alter the C-VAL model,
   socket contract, mobile input, or other active screens.
2. Reconstruct the **reading grammar** of a Bloomberg Terminal news function,
   not its superficial colours. The target is a thin functional header, compact
   mono records, one-line headlines, aligned metadata, and high record density.
   Hero cards, dashboard rails, large empty regions, decorative charts, and
   copied red command chrome are prohibited.
3. Show 54 news stories across two columns. The columns are one continuous,
   newest-first archive: a new story enters at the beginning, moves existing
   stories down and then into the right column, and only the 55th story removes
   the oldest one.
4. The feed is not a fixed nine-topic rotation, not a raw order/trade tape, and
   not execution-history filler. It must emit a new Korean headline only for a
   materially new, newsworthy C-VAL state event.
5. Newsworthiness is event-level: novelty, impact, and regime transition decide
   whether a story exists. Price expansion/reversal, meaningful order-flow
   transition, liquidity stress, and one directly supported transmission effect
   are candidate events. Equal state must not be republished. Event impact may
   order simultaneous arrivals, but it must not turn the archive into a fixed
   topic rank. The visible positional index remains: `01)`–`27)` in the left
   column and `28)`–`54)` in the right.
6. Do not fabricate external sources, timestamps, alerts, securities, or news.
   Every headline and displayed value must be derived from the actual C-VAL
   snapshot. The wire's `1D MOVE` field is specifically the preceding
   one-second C-VAL move (`oneSecondMovePercent`), not change from open.
7. Preserve smooth interaction. Never use a synthetic interval that repeatedly
   re-renders all 54 rows. Insert only newly admitted, stable-ID stories and
   keep existing records stable. Any motion must communicate a real insertion,
   not hide data rate or create decoration.
8. The user explicitly changed the arrival-speed requirement after the initial
   consultation: admission cadence follows the absolute one-second
   (C-VAL-day) price move on one continuous logarithmic curve with exactly two
   anchors: 0% is 400 ms, and ±30% or larger is 30 ms. There are no
   intermediate bands or anchors. This is a current-state cadence, not a
   permanent fixed speed.
9. The headline catalog must never claim or name an external live market,
   source, company, security, or institution. In particular, `C-VAL`, `코스피`,
   and `나스닥` do not appear in rendered news headlines. Use only
   C-VAL-grounded Korean
   market language such as `시장`, `주식시장`, `주가`, and `개인투자자`.

## What this record preserves

This is a failure record, not a handoff for an accepted interface. The initial
active-screen migration replaced the kinetic white field with a dark,
card-oriented “news monitor.” It was rejected by the user before visual
acceptance. Its code must not be treated as a reference or gradually polished.

The complete former screen family remains at `components/c-val/2/screen-legacy/`.
At the user's direction its obsolete modern `casino/` and `rollercoaster/`
folders were removed there, while `casino-legacy/`, `rollercoaster-legacy/`,
`media/`, and the original `news/` remain. The active public route stays under
`components/c-val/2/screen/`.

## The failed variable

The rejected implementation used a large lead article, an eight-cell card grid,
and a separate market-context rail. It also named this structure a
`newsMonitor` profile and documented it as though it were a successful
Bloomberg translation.

That was the wrong intervention. The question was how a C-VAL public-signal
field could inherit the **actual reading grammar of a Bloomberg news function**;
the implementation instead imported the generic “dark dashboard” grammar.

## Why it failed

These are not retrospective style preferences. They are the concrete defects
identified by the user and confirmed by inspection of the discarded markup.

1. **The reference was not structurally studied.** The implementation borrowed
   dark ground and amber accents from generic terminal imagery, but it did not
   model the ranked and time-ordered sequence used by Bloomberg news views.
   A large editorial hero has no counterpart in the examined wire examples.
2. **It converted one continuous feed into eight cards.** Large per-cell
   padding, a two-column grid, and a dominant lead created empty visual blocks
   where a news function uses consecutive records with fixed metadata columns.
3. **Its type system was unrelated to the target.** Oversized sans-serif
   headline treatment and roomy label/value modules replaced the compact
   monospace record rhythm, tabular right edge, and short coloured utility
   headers visible in the reference.
4. **It was sparse, not dense.** Only eight visual cards and one lead occupied
   the screen. The surrounding rail further diluted the record field. Reducing
   the font would not solve this; the information architecture itself was
   wrong.
5. **The documentation made the mistake harder to notice.** It claimed “lead,
   wire, and context” were distinct functional reading jobs even though the
   layout was a generic card dashboard. This acceptance language is withdrawn.

### Immediate second correction also rejected

The first response to this rejection copied the red top chrome from an older
Bloomberg screen capture. That was another surface-level error: C-VAL has no
matching actions, settings, or command function that would justify a red
function bar. It made the page stranger rather than more faithful to the
C-VAL controller’s restrained reading grammar. That red strip is removed.

The same intermediate version still rendered only the original nine signals at
large row heights. It therefore remained sparse despite changing the colours.

### Fixed-topic cycling and history filler also rejected

The next attempt made this worse in two ways. It ranked the same nine fixed
topic signals by a synthetic intensity and repeatedly cycled them through the
wire. Then it filled the remaining rows with near-identical execution-history
sentences. Neither is a news system: the former is a topic slideshow, and the
latter is repetitive market telemetry below the ninth headline.

It also injected three rows every 160 ms using a browser timer. This forced a
full 54-row React reconciliation and grid relayout 6.25 times each second,
regardless of whether C-VAL had observed a new event. The resulting visual rate
was artificial and was a direct cause of the reported performance problem.

## Reference observations now governing the replacement

The replacement is based on two captured Bloomberg terminal news examples,
checked alongside Bloomberg’s description of the functions:

- The **First Word FX** example has a thin functional header, a narrow topic
  index, then a single continuous black wire. Each item begins with a compact
  headline and may open into indented amber/cyan bullet detail. It has no
  hero-card hierarchy.
- The **Auto Intelligence** feed has a compact top command strip, a three-row
  `Top Ranked News` block with ordinal, headline, source and time columns,
  followed by `Time Ordered News` as a long single-line list. Density comes
  from the number of aligned records and their metadata, not from smaller type
  or decorative panels.
- Bloomberg itself describes **Top News** as the day’s key headlines and
  curated context, and **First Word** as a need-to-know bullet digest. That
  supports a ranked section and a compact bulletin section, but does **not**
  authorize a fabricated source, clock, alert, external story, security, or
  portfolio.

Reference sources:

- [Bloomberg Terminal News](https://professional.bloomberg.com/products/bloomberg-terminal/news/)
- [Bloomberg Auto Intelligence feed capture](https://assets.bbhub.io/professional/sites/12/Bloomberg-Auto-Intelligence.jpg)
- [Bloomberg First Word FX feed capture](https://eu-images.contentstack.com/v3/assets/blt7dacf616844cf077/blt1040f17acd7c1a1c/6798fa9e0849a1acfa2d9330/Bloomberg-FX-news-service.jpg?auto=webp&disable=upscale&quality=80&width=1280)

## Bound replacement trial

The current, still-unaccepted replacement is a bounded browser-side
**editorial story archive**, not an order/trade log. Raw mechanics may decide
that a C-VAL state is materially different, but they must never be rendered as
headlines. In particular, individual executions, orders, depth, and the word
“spread” have no place in a visible news title.

One Korean editorial story may be admitted for each materially new snapshot
condition: price-regime expansion or reversal (`MKT`), a genuine order-flow
regime transition (`MKT`), a financial-stability reading of changed liquidity
conditions (`POL`), or one directly supported transmission effect (`BIZ`,
`MACRO`, or `HH`). The title is selected from the condition and actual snapshot
values; there is no nine-topic rotation and no history filler. The catalog has
130 short, condition-specific Korean financial-news forms across rising and
falling market, momentum, broad stock-market, individual-investor,
corporate-finance, macro, household-wealth, policy, and reversal readings. A
visible title **and its template ID** are both rejected rather than duplicated.

Each candidate has an event-specific impact priority. Priority resolves only
simultaneous admissions; it does not create a fixed “top topic” section or
continuously re-rank older news. The wire itself remains newest-first.

```text
new material C-VAL state event
  -> one distinct editorial Korean headline + actual code/change
  -> prepend once to the 54-record log
  -> `01)`–`27)` in the left column, `28)`–`54)` continue in the right column
  -> record 55 displaces only the oldest record
```

The log has no synthetic timer, no artificial content rotation, and no fake
time or source. The React state changes only when a snapshot admits a fresh,
headline-distinct story; a snapshot that yields no new visible story does not
schedule an archive update. One eligible snapshot admits at most one story.
`recordsRef` preserves the next bounded archive between deferred renders, and
the archive component is memoized by that stable record array. Existing rows
keep both their stable event ID and event-object reference; their positional
numbers are CSS counters, so prepending does not pass changing index props
through 54 React rows. CSS containment confines the resulting layout work to
the two wire panes and their record rows.

### Arrival cadence trial — explicit user revision

Admission is deliberately separate from the editorial event generator. Every
incoming snapshot still evaluates whether a materially new story exists, but
the wire may prepend **one** story only after the price-move-derived interval
has elapsed. The interval is calculated from
`abs(snapshot.market.oneSecondMovePercent)`:

```text
0%      -> 400 ms
±30%+   ->  30 ms (never faster)
```

Let `r = min(abs(oneSecondMovePercent) / 30, 1)` and
`e = 1 - (1 - r)^2.2`. The exact rule is:

`intervalMs = round(exp(log(400) + (log(30) - log(400)) × e))`.

This is a single nonlinear exponential mapping in log-interval space, not a
chain of `if`/`else` speed bands. The exponent is curve shape, not an
additional movement anchor: its practical result is roughly 100 ms at ±10%.
At 30%, `e` arrives at 1 with zero slope; retaining the 30 ms floor above 30%
therefore does not make the cadence jump or abruptly accelerate. At a still
market it is a readable wire: one real second is one C-VAL market day and one
headline may arrive each second. Intermediate values are derived by the curve
and are not separate behavioral rules or anchors.

The market source samples at 50 ms. To allow a 30 ms extreme wire without
inventing a story, a bounded 16-item queue holds distinct editorial candidates
already derived from actual high-motion snapshots. It drains one record at a
time only while nonempty. There is no autonomous content source, text rotation,
or batch append; an empty queue has no live scheduler. The bounded queue
discards stale older candidates rather than replaying them later as a fake
burst, and the memoized archive still performs one prepend per eligible window.

## Invariants and open acceptance condition

- Do not change the C-VAL model, socket protocol, mobile input, or other screen
  renderers.
- Do not retain a card grid, dominant lead, generic KPI rail, rounded panel
  language, decorative chart, red command strip, or motion from the rejected
  attempts.
- Do not restore fixed-topic cycling, generated history filler, or a timer that
  mutates the log without a newly observed C-VAL event.
- Keep the legacy news field available as a preserved alternative.
- A 1467 × 751 local HTTPS capture on 2026-08-10 confirmed that `01)`–`27)`
  and `28)`–`54)` fill the two columns continuously. Earlier captures showing
  `TRD`, `ORD`, or `LQ` labels are rejected raw-telemetry trials, not a valid
  acceptance reference. This establishes only the current visual state; it is
  not user acceptance or a performance guarantee.

The replacement is still pending visual review. Do not describe it as
accepted until the running C-VAL route—not only source inspection—has been
compared with the captured Bloomberg wire references.
