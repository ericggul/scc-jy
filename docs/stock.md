# Stock Experiment

Routes:

- `/stock`
- `/stock/1`
- `/stock/2`
- `/stock/3`
- `/stock/4`
- `/stock/5`

Files:

- `app/stock/page.tsx`
- `app/stock/[experiment]/page.tsx`
- `components/stock/experiments.ts`
- `components/stock/data.ts`
- `components/stock/primitives.tsx`
- `components/stock/system.tsx`
- `components/stock/[1-5]/index.tsx`

Intent:

Stock contains numbered interface studies around market/data display patterns.
The current implementation treats the five screens as named positions inside one
parametric interface system, not as five unrelated pages.

Design model:

- `/stock/1` starts as a terminal command center: dense, black, phosphor-like,
  table-forward, and trader-facing.
- `/stock/2` starts as a consumer watchlist: white surfaces, rounded cards,
  calm hierarchy, and story/watchlist emphasis.
- `/stock/3` starts as an institutional graph wall: dark, large-format,
  grid-heavy, and risk/breadth oriented.
- `/stock/4` starts as an options-flow cockpit: dark green, high contrast,
  derivatives flow, liquidity lanes, and volatility framing.
- `/stock/5` starts as a portfolio brief: quiet, allocation-first, executive,
  and review oriented.

Parametric model:

- `interface morph` selects or blends between the five layout renderers.
  Integer stops correspond to the same `/stock/1` through `/stock/5` identities;
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

- `components/stock/[1-5]/index.tsx` are thin wrappers. They only set
  `initialVariant`, which keeps route-level navigation intact.
- `components/stock/system.tsx` owns presets, interpolation, randomized motion,
  layout renderers, and the top control deck.
- `components/stock/data.ts` owns market data and variant palette metadata.
- `components/stock/primitives.tsx` owns reusable chart/formatting/navigation
  primitives.

Implementation rule:

- Shared stock primitives stay in `components/stock/primitives.tsx`.
- Shared stock data stays in `components/stock/data.ts`.
- Shared parametric behavior stays in `components/stock/system.tsx`.
- Variants stay under `components/stock/[variant]/`.
