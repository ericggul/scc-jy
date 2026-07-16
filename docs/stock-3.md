# Stock 3 — Bloomberg workstation reconstruction

This document is the handoff and preservation contract for `/stock/3`. It
records the reference, the user feedback that shaped the implementation, the
current information architecture, and the mistakes that future agents must not
repeat.

The user accepted the current implementation as sufficiently close, while
explicitly noting that it is not a claim of 100% pixel-perfect equivalence.
Future work should therefore treat the current screen as the accepted baseline
and the supplied image as the final visual authority. Do not casually redesign
the screen or reduce its information density.

## 1. Reference and acceptance standard

The original reference was supplied as:

- `/Users/jeongyoonchoi/Downloads/ux1jpg.jpg`
- Codex attachment copy:
  `/Users/jeongyoonchoi/.codex/attachments/3009d480-0222-4876-b800-73a30786af02/image-1.jpg`

These are machine-local paths and may not exist in another environment. If the
image is unavailable, ask for it again rather than reconstructing it from
memory.

The acceptance standard is not “a dark financial dashboard.” It is the same
workstation grammar as the reference:

- matching macro composition and panel hierarchy;
- matching amount and type of information inside each panel;
- comparable visual density at a glance;
- compact terminal typography with stable numeric alignment;
- irregular, market-like chart movement rather than ornamental waveforms;
- meaningful selection behavior across the monitor;
- responsive layouts that retain all records instead of hiding or clipping
  them.

Source inspection, lint, and type checking cannot prove this standard alone.
When browser verification is authorized, compare a full-page screenshot with
the reference and inspect both the large silhouette and the contents of every
panel.

## 2. Participant and interface rationale

- **Participant situation:** A market observer scans one workstation during a
  reference trading session.
- **Primary relation:** Relative direction across equities, rates, currencies,
  commodities, breadth, and market-moving news.
- **Perceptual job:** Gains, losses, divergence, breadth, and changes across
  multiple time horizons must be legible without opening another page.
- **Interaction job:** Entering a symbol or selecting a market record updates
  the selected security and the relative-performance chart without disrupting
  the monitor composition.
- **Wrapper justification:** Dense terminal structure is the established
  working grammar of cross-market comparison in this experiment. It is not a
  generic dashboard theme applied for atmosphere.
- **System family:** `stock/2` and `stock/3` share compact table alignment,
  tabular numerals, function codes, semantic orange, green, red, cyan, and
  restrained panel chrome.

## 3. What the user feedback actually required

The repeated feedback was not primarily about one incorrect column percentage.
The core complaint was that the implementation had misunderstood what existed
inside the reference.

### 3.1 Composition is more than outer rectangles

Early versions approximated the screenshot with a few large dashboard panels.
Even when their outer boundaries became closer, the screen still felt empty
because the internal information architecture was wrong. A panel is only
faithful when its row count, column count, information types, visual layers,
and alignment are also comparable.

Do not report progress merely because the outer grid resembles the reference.
For each panel, count the visible records and identify what every column or
visual layer does.

### 3.2 Density means information density, not smaller text

The user repeatedly described earlier screens as empty or “thinning out.” The
fix was not to shrink the font or add decorative dividers. The fix was to add
the missing records and secondary fields:

- the upper-left return field required 20 securities, not 10;
- the upper-right matrix required 28 rows with seven period cells, a sparkline,
  a 52-week range marker, and an endpoint value;
- the central tables required complete row sets and multiple aligned metrics;
- the macro strip required price, change, high/low, open, net, volume, range,
  bid/ask, distribution bars, and a price line;
- the news and story areas required enough text to occupy their intended
  reading area while leaving their charts visible.

Adding records without increasing available panel height is also wrong. One
iteration expanded the matrix but squeezed every row until the text appeared
vertically crushed. The matrix height was then increased from 44% to 52% of the
right workspace.

### 3.3 Typography must remain readable at terminal density

The desired terminal typography is compact, not distorted. Do not solve an
overflow problem with `transform: scaleX(...)`, extreme letter spacing, or a
globally tiny font. Preserve real row height and use fixed tabular columns.

The current wide-screen base is:

```css
font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
font-size: clamp(10px, min(0.7vw, 1.18vh), 14px);
```

Large values, labels, and utility text use local size adjustments. Numeric
columns remain right-aligned; names and symbols remain left-aligned. Ellipsis
is used only where the column contract requires it.

### 3.4 Charts must not reveal a synthetic sine-wave recipe

Earlier chart series visibly repeated sine-like curves. That immediately made
the interface look fake. The current `makeSeries` uses a deterministic seeded
LCG, cumulative drift, bounded noise, and occasional impulses. This produces
stable server/client output and irregular, reproducible market-like paths.

Do not reintroduce `Math.random()` or `Math.sin()`:

- `Math.random()` risks hydration differences and makes screenshots unstable;
- repeated trigonometric paths look ornamental and are easy to recognize;
- each record needs its own stable path, not a recolored copy of one curve.

`linePoints` normalizes each series into its SVG viewport. If the chart model is
changed, preserve deterministic input and stable output.

### 3.5 Responsive means retaining the artifact, not clipping it

Earlier responsiveness adjusted outer panel widths while leaving fixed inner
content, or reduced panel heights after record counts increased. That caused
rows to overlap or disappear.

The rule for this screen is: every breakpoint must retain every record. Reflow,
increase panel height, or allow deliberate horizontal inspection. Never hide
rows to make the layout technically fit.

## 4. Current wide-screen geometry

The dashboard uses a 100×100 CSS grid with 2px gaps and 2px outer padding. The
column boundaries are intentionally explicit:

- left region: columns `1 / 29` — approximately 28%;
- middle region: columns `29 / 59` — approximately 30%;
- right region: columns `59 / 101` — approximately 42%.

The vertical contracts are:

| Region | Panel | Grid rows | Approx. share |
| --- | --- | ---: | ---: |
| Left | International clocks | `1 / 22` | 21% |
| Left | Hot Up / Hot Down | `22 / 63` | 41% |
| Left | First Word story | `63 / 101` | 38% |
| Middle | Economic releases | `1 / 18` | 17% |
| Middle | Sovereign markets | `18 / 65` | 47% |
| Middle | Breadth + active securities | `65 / 101` | 36% |
| Right | Security matrix | `1 / 53` | 52% |
| Right | Macro dashboard | `53 / 73` | 20% |
| Right | News + relative chart | `73 / 101` | 28% |

The lower middle splits at columns `29 / 45 / 59`. The lower right splits at
columns `59 / 79 / 101`.

These coordinates are important, but they are not independently sufficient.
Changing them must be evaluated together with the information counts below.

## 5. Information-density contract

The following counts are intentional. Reducing them changes the visual and
functional character of the screen.

| Panel | Required contents |
| --- | --- |
| International clocks | 4 cities, each with time, city, session/date, zone, cash hours, temperature, and weather |
| Hot Up / Hot Down | 20 selectable securities in a 5×4 wide-screen grid; name, daily %, symbol, last, net, 1W, and YTD |
| First Word | category strip, headline, four dense body paragraphs plus quotation, two-series comparison chart, source line |
| Economic releases | 5 releases with time, country, event, actual, survey, and prior |
| Sovereign markets | 20 selectable cross-asset rows with market, symbol, last, change, daily heat cell, 1W, 1M, and YTD |
| World market intensity | 2 stacked segmented breadth charts; each has advancing value and 5 category/region rows |
| S&P performance | 18 selectable securities, grouped as 6 gainers, 6 losers, and 6 remaining records |
| Security matrix | 28 selectable rows grouped 7 + 9 + 12; symbol, sparkline, last, 7 period heat cells, 52W range marker, endpoint |
| Major market dashboard | 8 selectable cards; symbol, change, last, H/L, open, net, volume, range, 8 distribution bars, sparkline, bid/ask |
| News & research | 14 rows with time, function/topic code, and headline |
| Relative performance | 4 deterministic comparison lines, grid, legend, and time labels |

The arrays in `model/workstation-data.ts` own stable record IDs. Component
grouping may use slices, but the IDs remain the React keys.

## 6. Interaction contract

The screen owns one selected `symbol` state.

The following actions update it:

- submitting the command input;
- selecting any of the 20 return tiles;
- selecting any of the 20 sovereign/cross-market rows;
- selecting any of the 18 active-security rows;
- selecting any of the 28 matrix rows;
- selecting any of the 8 macro cards.

The selected symbol appears in the command-area security label and the
relative-performance legend. Adding a new selection surface should reuse this
same state path unless the user explicitly requests a separate mode.

Macro cards use an absolutely positioned, accessible button over semantic
article content. Do not place flow elements such as `header`, `dl`, and `footer`
inside a button; that produces invalid interactive markup.

## 7. Responsive contract

### Above 1200px

- Fixed 100×100 workstation mosaic.
- `height: 100dvh` and no page scrolling.
- Typography scales from the same viewport constraints as the panels.
- All 20 return tiles and 28 matrix rows remain visible.

### 721–1200px

- Panels reflow into paired 50% columns.
- The matrix and macro strip take full width.
- Explicit panel heights increase to preserve full record sets.
- The page may scroll vertically; internal records must not be clipped.

### 431–720px

- Panels become single-column.
- Return tiles remain 5×4 with a 520px panel height.
- The matrix keeps a 900px internal width and is horizontally inspectable.
- Macro cards become 4×2.
- The two-row terminal chrome remains 58px tall; low-priority function-strip
  items are hidden rather than compressed.

### 430px and below

- Clocks become 2×2.
- Return tiles become 2×10 with a 1080px panel height.
- Macro cards become 2×4 with a 920px panel height.
- Breadth blocks stack their chart and category detail.

When record counts change, recalculate both the grid rows and the corresponding
breakpoint heights. Do not update one without the other.

## 8. Visual grammar to preserve

- Near-black base, dark gray functional headers, and thin neutral panel rules.
- Bloomberg orange for titles, function codes, and selected navigation.
- Green and red encode direction and heat intensity; they are not decorative
  accent colors.
- Cyan identifies selected or security-oriented labels; purple is reserved for
  a comparison series.
- Dense table alignment, restrained hover feedback, and no rounded dashboard
  cards, glow, glass, gradients, fake live badges, or ornamental metrics.
- Panel headers are short and functional. Do not add explanatory captions or
  repeated divider bars.
- Information hierarchy comes from row grouping, type, alignment, and semantic
  color, not whitespace-heavy cards.

## 9. Architecture and file ownership

```text
components/stock/3/
├── index.ts                         public component entry
├── model/
│   └── workstation-data.ts         records, stable IDs, deterministic series
└── screen/
    ├── workstation.tsx             interaction state and panel composition
    └── workstation.module.css      geometry, density, palette, breakpoints
```

Routing remains thin:

- `app/stock/[experiment]/page.tsx` maps route `3` to the component;
- `components/stock/experiments.ts` registers `stock/3` and the direct route;
- `docs/stock-3.md` is the scoped design and preservation record.

Do not move data back into the route or accumulate unrelated flat files in the
experiment root.

## 10. Failure history and lessons

### Sparse approximate clone

The first implementations used the general idea of a Bloomberg terminal but
invented different panels, fewer records, large empty areas, and oversized
charts. This was rejected because mood and palette are not fidelity.

**Rule:** identify every visible information family before coding. Record count,
field count, and nesting depth are first-class design requirements.

### Editing a weak approximation instead of rebuilding

Incremental changes to the wrong information architecture preserved the wrong
assumptions. The user explicitly requested a fresh reconstruction rather than
continuing to patch the earlier clone.

**Rule:** if panel semantics and density are wrong, rebuild the component and
model layers. Do not protect sunk-cost markup.

### Sine-wave charts

Repeated smooth curves made the synthetic origin obvious.

**Rule:** use deterministic irregular series with distinct seeds and cumulative
movement. Judge the whole family of charts, not one example.

### More rows without more space

Expanding the upper-right matrix to the correct density initially crushed its
text.

**Rule:** density must remain readable. Increase panel allocation or reflow the
layout when the row count grows.

### Non-responsive record counts

After the return field grew from 10 to 20 records, old mobile heights and a 2×5
grid would have clipped half the records.

**Rule:** every data-count change requires a breakpoint audit.

### Missing stylesheet during refactor

An intermediate `screen/index.tsx` imported `./terminal.module.css` after that
file had been removed, causing a Next module-not-found failure.

**Rule:** switch the public entry only after its new component and stylesheet
exist. Search imports before deleting or renaming a CSS module.

### Unstable or missing React keys

SVG/list rendering previously emitted the React warning that every child in a
list needs a unique key.

**Rule:** data records own stable IDs. Derived fixed cells use a stable record ID
plus a fixed semantic/index suffix. Never use generated display copy,
pseudo-random text, or mutable values as keys.

### Starting a development server

An agent attempted to start the repository server and collided with port 3000.
This violated the repository rule and disrupted the user's existing process.

**Rule:** never run `pnpm dev`, `pnpm dev:http`, or `pnpm build`. Never start or
kill a dev server. Browser verification is allowed only when the user explicitly
requests it, must use the already-running HTTPS server, and must not mutate that
server's lifecycle.

## 11. Verification procedure

### Static verification

Allowed checks include:

```sh
pnpm lint -- components/stock/3/index.ts \
  components/stock/3/model/workstation-data.ts \
  components/stock/3/screen/workstation.tsx

pnpm exec tsc --noEmit
```

At the time of this handoff, stock/3 lint and CSS parsing passed. Repository-wide
TypeScript checking was blocked by an unrelated existing missing module at
`components/sns/youtube/1/index.ts` importing `./screen`. Do not misattribute
that error to stock/3.

### Visual verification

When explicitly authorized:

1. Use the already-running HTTPS route at `/stock/3`.
2. Capture the whole workstation at a representative wide viewport.
3. Place the capture beside the original reference.
4. Compare, in order:
   - outer three-region silhouette;
   - vertical panel boundaries;
   - record counts and group counts;
   - text legibility and column alignment;
   - chart irregularity and visible chart area;
   - clipped or empty regions;
   - interaction surfaces;
   - tablet and phone record retention.
5. Treat any uncertain visual item as unverified rather than complete.

Headless browser processes may fail to exit cleanly on this machine even after
writing a screenshot. Use a unique temporary browser profile, do not reuse a
locked profile, and do not touch the user's interactive browser session.

## 12. Checklist for future modifications

Before editing:

- Read this document, `AGENTS.md`, `docs/design-guidelines.md`, and
  `docs/stock-ui-preservation-postmortem.md`.
- Inspect the current rendered screen and the original reference.
- Separate requested changes from preserved visual and interaction contracts.
- Count affected records at every breakpoint.

Before reporting completion:

- Confirm 20 return tiles, 20 sovereign rows, 18 active rows, 28 matrix rows,
  8 macro cards, and 14 news rows.
- Confirm the matrix still has seven heat periods plus range and endpoint.
- Confirm no text is vertically or horizontally distorted.
- Confirm all selection surfaces update the common symbol state.
- Confirm every mapped record and SVG child has a stable key.
- Confirm the feature-story and relative charts are fully visible.
- Confirm desktop, tablet, and phone layouts retain all records.
- Run scoped lint and TypeScript checks without starting or building the app.
- If a visual comparison was not authorized or could not be performed, state
  that limitation explicitly.

The final test is perceptual: at a glance the screen should feel occupied by
coherent market information, not by empty panels decorated to resemble a
terminal.
