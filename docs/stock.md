# Stock Experiment

Routes:

- `/stock`
- `/stock/test`
- `/stock/test/1`
- `/stock/test/2`
- `/stock/test/3`
- `/stock/test/4`
- `/stock/test/5`

Files:

- `app/stock/page.tsx`
- `app/stock/test/page.tsx`
- `app/stock/test/[experiment]/page.tsx`
- `components/stock/test/experiments.ts`
- `components/stock/test/data.ts`
- `components/stock/test/primitives.tsx`
- `components/stock/test/system.tsx`
- `components/stock/test/[1-5]/index.tsx`

Intent:

Stock currently keeps the first five market/data display screens only as archived
reference material under `test`. Do not treat them as the active direction for a
new stock experiment.

The archived implementation treats the five screens as named positions inside
one parametric interface system, not as five unrelated pages.

Design model:

- `/stock/test/1` starts as a terminal command center: dense, black, phosphor-like,
  table-forward, and trader-facing.
- `/stock/test/2` starts as a consumer watchlist: white surfaces, rounded cards,
  calm hierarchy, and story/watchlist emphasis.
- `/stock/test/3` starts as an institutional graph wall: dark, large-format,
  grid-heavy, and risk/breadth oriented.
- `/stock/test/4` starts as an options-flow cockpit: dark green, high contrast,
  derivatives flow, liquidity lanes, and volatility framing.
- `/stock/test/5` starts as a portfolio brief: quiet, allocation-first, executive,
  and review oriented.

Parametric model:

- `interface morph` selects or blends between the five layout renderers.
  Integer stops correspond to the same `/stock/test/1` through `/stock/test/5` identities;
  fractional values crossfade between adjacent renderers while interpolating
  palette, radius, and type scale.
- `data lens` chooses which symbol is the current focus. The same interface can
  therefore be transferred across NVDA, AAPL, MSFT, TSLA, JPM, and XOM without
  changing the route.
- `density` changes panel padding and compactness. This preserves each style's
  vocabulary while letting the same information architecture become loose,
  balanced, or compact.
- `signal stress` projects the shared price series and volume values. This makes
  the displayed market data parameteric rather than decorative.
- `random morph` continuously generates random parameter targets and eases
  toward them. It is not a route shuffle; it animates the same underlying
  interface space.

Code model:

- `components/stock/test/[1-5]/index.tsx` are thin wrappers. They only set
  `initialVariant`, which keeps route-level navigation intact.
- `components/stock/test/system.tsx` owns presets, interpolation, randomized motion,
  layout renderers, and the top control deck.
- `components/stock/test/data.ts` owns market data and variant palette metadata.
- `components/stock/test/primitives.tsx` owns reusable chart/formatting/navigation
  primitives.

Implementation rule:

- Archived shared stock primitives stay in `components/stock/test/primitives.tsx`.
- Archived shared stock data stays in `components/stock/test/data.ts`.
- Archived parametric behavior stays in `components/stock/test/system.tsx`.
- Archived variants stay under `components/stock/test/[variant]/`.
