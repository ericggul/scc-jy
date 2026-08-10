# C-VAL Bloomberg workstation visual wrapper

> Status: reusable C-VAL 2 visual grammar, introduced 2026-08-10  
> Code: `components/c-val/2/visual/`  
> First adoption: `components/c-val/2/controller/`

## Scope

This is a locally named **Bloomberg workstation aesthetic**: a visual grammar
for an observer who must compare live, consequential records quickly. It is
informed by the accepted C-VAL controller, `stock/3`, and the public idea of a
customizable Bloomberg Launchpad. It is not a Bloomberg product clone, a
claim about Bloomberg's proprietary design system, or permission to paste
terminal chrome onto unrelated work.

The C-VAL controller is a valid use because its job is simultaneous comparison
of conditions, agent intent, FIFO supply, executions, and outcomes. The
rollercoaster, media, casino, and mobile routes have different jobs and must
not become mini-workstations. News has a separately documented, observer-facing
wire trial: it renders the actual market-to-public-signal transmission as one
continuous record field, rather than treating terminal chrome as atmosphere.

The wrapper is deliberately C-VAL-version scoped today. Its primitives contain
no model data or controller logic, so a later experiment with the same
observer task may promote a reviewed copy to a genuinely shared visual family.
Do not cross-import this path into another project simply because it is dark
or financial-looking.

## The aesthetic, precisely

The characteristic feeling is **packed operational calm**. A person can scan a
whole field before deciding where to look closely; a detail can be compared
with its context without leaving the screen. It looks busy because each visible
mark answers a different observation question, not because it is crowded with
texture.

| Visible quality | Operational cause | Explicit non-example |
| --- | --- | --- |
| Packed | Several bounded, non-duplicated records are visible together | tiny text, repeated filler values, empty decorative cells |
| Financial | price, sides, queues, time, and outcomes have different visual forms | invented ticker symbols, portfolio fiction, timestamps, alerts, or news |
| Fast to scan | aligned columns, tabular figures, short headers, stable placement | a collection of differently styled cards requiring re-orientation |
| Quietly authoritative | flat planes, functional one-pixel rules, sparse semantic colour | glow, glass, gradients, soft shadows, neon effects, or visual noise |
| Alive | direct updates reveal actual changing state | count-up animation, scan lines, pulsing badges, decorative wave paths |

This means that the wrapper is a **reading system**, not a colour scheme. A
new panel earns its place only when it lets someone observe a distinct part of
the real mechanism. A new colour earns its place only when a person can infer
a different state from it.

## Evidence and local interpretation

`stock/3` establishes the relevant local lessons: dense but readable records,
asymmetric workstation composition, tabular comparison, irregular data traces,
and responsive retention of the artifact. The C-VAL controller applies them to
one market's actual causal chain. Bloomberg's public Terminal material describes
customizable linked workspaces; it supports the workstation premise but does
not prescribe our individual pixels or data model.

- [Stock 3 preservation contract](../dashboard/stock/3.md)
- [C-VAL 1 controller visual contract](./1.md#bloomberg-informed-visual-decisions)
- [Controller scale trial](./2-controller-responsive-bloomberg-grammar-2026-08-10.md)
- [Bloomberg Terminal](https://professional.bloomberg.com/products/bloomberg-terminal/)

The design decisions below are therefore C-VAL rules, grounded in those
references. They are not claims that Bloomberg requires a particular hex value
or panel arrangement.

## Tokens

`components/c-val/2/visual/tokens.ts` owns the canonical values. A controller
or future C-VAL observer view should consume the variables from
`CValBloombergWorkstationFrame`, not restate a near-equivalent dark palette.

| Token | Value | Role |
| --- | --- | --- |
| ground | `#030403` | uninterrupted working field |
| surface / raised | `#070907` / `#181B18` | data plane and small functional elevation |
| header | `#242722` | compact panel identity, not a card title banner |
| rule / strong rule | `#353A34` / `#565B53` | separates real record groups and panel headers |
| text / muted / dim | `#E6E5DD` / `#90948B` / `#666B63` | three readable levels before type is reduced |
| amber | `#F0A000` | function hierarchy, active functional code, V, and a narrow focal point |
| positive | `#20BD68` | gain, buy side, bid depth, and positive direction |
| negative | `#E94A58` | loss, sell side, ask depth, and negative direction |
| liquidity | `#45ACC7` | liquidity and resting-supply identity |

The hierarchy is intentional: amber says **where to begin**, green/red say
**which direction or side**, and cyan says **what supplies liquidity**. None
is a general accent. Primary text remains warm off-white so the field is not a
black-and-orange poster.

The smaller workstation shades in `cValBloombergWorkstationChassis` are also
intentional: chrome (`#1C1F1B`), table headers (`#171A16`), row rules
(`#20241F`), data rules (`#252924`), and restrained bid/ask depth fills
(`#0B3921` / `#40161C`) create legible layers without introducing rounded
cards or shadow-based depth. They are support values for a monitor frame, not
additional accents to export onto a full-bleed screen.

## Typography and density

The wrapper uses a mono stack for records and tabular figures and a neutral
sans stack only for functional headings and a primary executed price. Numeric
columns are right-aligned; names and labels are left-aligned. All data values
inherit `font-variant-numeric: tabular-nums`.

At the accepted controller reference of **1467 × 750 CSS px**:

- root operational type is 12 px;
- compact utilities have a 10 px floor;
- record rows and book/trade rows are normally 11 px;
- labels reduce in contrast before they reduce below their role-specific floor;
- row mechanics, minimum columns, panel headers, gaps, and type share one
  scale unit.

Density never means compressed glyphs, `scaleX`, arbitrary letter spacing,
lowering every font below legibility, or substituting colored blocks for
records. It is the presence of the correct records, secondary fields, and
visually appropriate evidence for the current domain.

## Layout grammar

### Workstation frame

Use `CValBloombergWorkstationFrame` only for a view whose user needs
simultaneous evidence. It supplies semantic variables, mono inheritance, and
tabular figures. It deliberately does not make a grid, invent panels, or add a
command bar. Those must arise from the actual observation task.

```tsx
import {
  CValBloombergWorkstationFrame,
  cValBloombergPanel,
  cValBloombergPanelHeader,
  cValBloombergRecordRow,
} from "@/components/c-val/2/visual";

const Panel = styled.section`
  ${cValBloombergPanel}
  display: grid;
`;
```

The primitive set is intentionally small:

| Primitive | Job | Must not do |
| --- | --- | --- |
| `CValBloombergWorkstationFrame` | tokens, baseline type behavior, semantic colour | fabricate a terminal layout or market content |
| `cValBloombergPanel` | contain one distinct observational data set | turn every content block into a card |
| `cValBloombergPanelHeader` | identify a real data set in one short line | add explanatory captions or decorative numbering |
| `cValBloombergRecordRow` | preserve comparative row alignment and value placement | decide columns, record count, or information hierarchy |

Macro layout is asymmetric whenever the actual information burden is
asymmetric. The controller's staggered six regions are not a stylistic grid to
reuse blindly. A panel with twelve ordered events may deserve more vertical
space than a panel with three stable conditions; a screen with one full-bleed
image may deserve no panel at all.

### Panel anatomy

For genuine observer panels, use this order when the data supports it:

```text
short functional header     what data set is this?
summary or current reading  what is true now?
ordered evidence            why is it true / how is it changing?
```

Rules separate those layers only when the reader must distinguish them. Square
corners and one-pixel rules are functional containment, not a surface style to
repeat everywhere.

### Responsive rule

At wide desktop sizes, preserve the **information-to-screen proportion**, not
merely the outer panel bounds. The shared workstation scale is:

```css
font-size: max(12px, min(0.818vw, 1.6dvh));
```

It holds the 1467 × 750 field at 12 px. Above that field, the smaller viewport
dimension controls the common scale, so type and row mechanics grow together
and an ultrawide-but-short monitor does not overflow vertically. Components
that visually belong together must use `em` from this root for their type,
minimum widths, row heights, header heights, and gaps.

At constrained widths, reflow first. Preserve every record, add real panel
height where needed, or offer deliberate local horizontal inspection for an
unalterable data table. Do not hide records, clip rows, or globally shrink the
instrument just to keep a desktop mosaic on a phone.

## Time and motion

The workstation has no decorative motion. Current state may change at the
market's real update cadence, and lines, bars, depth, and highlights update as
direct readings of that state. It must not add count-up tweens, pulse loops,
scan lines, parallax, panel entrances, or interpolated activity that hides the
real time relation.

Motion on C-VAL's other screens remains specific to their own representation:

| Screen | Profile | May share | Must retain / must not receive |
| --- | --- | --- | --- |
| controller | `workstation` | full token set and all observation primitives | real causal chain; no invented terminal content |
| rollercoaster | `physicalInstrument` | gain/loss semantic direction when it aids reading | executed-price rail and sparse physical scene; no panels, tables, or terminal labels |
| news | `newsWire` | thin wire-specific header and a continuous two-column archive of actual editorial stories | real market-to-public transmission; raw trades, orders, depth and spreads may be evidence but never news titles; no invented source, time, external feed, alert, red command strip, card grid, fixed-topic cycle, or generic dashboard metric |
| media | `fullBleedMedia` | state-derived direction only | black full-bleed audiovisual grid; no data overlay merely to look financial |
| casino | `physicalInstrument` | actual execution price and meaningful state colour | mechanical three-reel representation; no monitor chrome |
| mobile | `feedbackInstrument` | semantic gain/loss only where it explains real feedback | one physical input and immediate response; never a condensed controller |

The shared family relationship therefore exists at the level of truthfulness,
semantic colour, update discipline, and proportional responsiveness—not a
uniform visual costume.

## Failure prevention

Earlier attempts in both C-VAL and `stock/3` establish hard constraints:

1. Do not call a sparse panel grid “Bloomberg.” If the records are missing,
   add actual evidence or remove the panel.
2. Do not solve density with smaller fonts, horizontally compressed type, or
   clipping. The screen may be compact; it must remain readable.
3. Do not use smooth sine-like charts. Histories must arise from deterministic
   domain data or irregular state history, never a recognizable decorative
   recipe.
4. Do not let a generic terminal wrapper overwrite the surrounding artwork's
   perceptual task. The news-wire trial is permitted only because its continuous
   event records make the actual market-to-public-signal transmission easier to
   scan; it does not authorize terminal chrome for the other screens.
5. Do not create simulated monitoring fiction: command prompts, alerts, live
   badges, timestamps, news, securities, and portfolio tools require a real
   C-VAL function before they can appear.
6. Do not put presentation state in the socket protocol. The browser derives
   color, position, bar width, opacity, and update rendering from abstract
   state.
7. Do not change interaction mechanics and visual wrapper in the same trial.
   The C-VAL interaction failure record shows why causes must remain legible.

## Adoption review

Before a future C-VAL view adopts the full workstation frame, answer all four
questions yes:

1. Does one observer need to compare multiple real data representations at
   once?
2. Does every proposed panel contain a distinct bounded data set?
3. Does the visible record count remain legible at the target viewport and
   every reflow breakpoint?
4. Does the screen gain more causal legibility from the wrapper than it loses
   from covering its own medium?

If any answer is no, select a non-workstation profile from
`cValBloombergScreenProfiles` and share only the applicable semantic rule. A
new screen implementation must record its selected profile, changed relation,
retained visual invariants, responsive behavior, and a screenshot-based
comparison in its own experiment note.
