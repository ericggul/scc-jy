# Stock experiments

Routes:

- `/stock`
- `/stock/1`
- `/stock/2`

## Structure

- `app/stock/page.tsx` is the minimal experiment index.
- `app/stock/[experiment]/page.tsx` owns dynamic routing only.
- `components/stock/experiments.ts` is the route registry.
- `components/stock/1/index.tsx` is the Apple Stocks-like graph stack.
- `components/stock/2/index.tsx` is the interactive Bloomberg-inspired terminal.
- `components/stock/2/data.ts` owns stable market, index, and headline records.
- `components/stock/2/terminal.module.css` owns the fixed-format responsive workstation styling.

## stock/2 intent

The Bloomberg-inspired experiment is a compact market workstation built from distinct function screens rather than a generic dashboard. It preserves the Terminal's command grammar, dense hierarchy, tabular typography, numbered actions, and semantic color without using Bloomberg branding.

The default `HOME` screen is an integrated market dashboard combining an equity monitor, selected-security candlestick/volume study, market-moving news, breadth, and the next economic release. Supported command tokens include a listed ticker plus `HOME`, `WEI`, `GP`, `TOP`, or `ECO`. `WEI` renders regional world-index tables, `GP` renders the expanded price study and security statistics, `TOP` renders ranked editorial sections, and `ECO` renders an economic release calendar. Selecting a security in `HOME` or `GP` updates the price study. The layout fills the viewport and scales its internal type, spacing, tables, chart, and visibility rules with the same responsive system as the outer frame.

The discarded prototype system must not be restored. Research evidence and design rationale live in [stock-research.md](./stock-research.md).
