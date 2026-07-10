# Stock experiments

Routes:

- `/stock`
- `/stock/default`
- `/stock/1`
- `/stock/1/mobile`
- `/stock/1/screen`
- `/stock/mobile/1`
- `/stock/screen/1`
- `/stock/2`

## Structure

- `app/stock/page.tsx` is the minimal experiment index.
- `app/stock/[experiment]/page.tsx` owns direct/default routing only.
- `app/stock/[experiment]/mobile/page.tsx` and `screen/page.tsx` are compatibility aliases.
- `app/stock/mobile/[experiment]/page.tsx` and `screen/[experiment]/page.tsx` are the expandable role routes.
- `components/stock/experiments.ts` is the route registry.
- `components/stock/default/dashboard.tsx` and `historical-data.ts` preserve the original standalone graph stack and data.
- `components/stock/1/mobile.tsx` captures device orientation and emits stock-only signals.
- `components/stock/1/screen.tsx` owns the shared live market clock.
- `components/stock/default/dashboard.tsx` also exposes the reusable graph surface consumed by the live screen.
- `components/stock/1/market-model.ts` owns orientation mapping, calibration, and stochastic stepping.
- `components/stock/1/use-stock-socket.ts` owns the client socket contract.
- `socket/experiments/stock.mjs` owns the isolated `stock:*` room and events.
- `components/stock/2/index.tsx` is the interactive Bloomberg-inspired terminal.
- `components/stock/2/data.ts` owns stable market, index, and headline records.
- `components/stock/2/terminal.module.css` owns the fixed-format responsive workstation styling.

## stock/1 signal model

The mobile zeroes `alpha`, `beta`, and `gamma` against the device pose captured when motion starts, then sends signed deltas. `ZERO` recalibrates that pose. The screen maps front/back beta tilt directly to broad market direction, alpha rotation to sector rotation, and lateral gamma tilt to growth/defensive divergence. A small dead zone removes sensor jitter, then a fast low-pass response feeds ten independent stochastic processes. Every stock has explicit alpha/beta/gamma sensitivity, inertia, signal gain, volatility, and mean-reversion parameters in `stockCalibrations`.

The simulation appends new world-space points and translates the fixed chart window. Existing points are never regenerated from a new sensor reading. The live y-domain follows the rolling window: it expands quickly when a new extreme arrives, contracts slowly after that extreme leaves, and always includes proportional breathing room around the visible prices. This keeps sharp moves on-screen without abrupt range snapping. A distant 5%-to-2,000% safety bound prevents invalid prices. Global intensity and range-following controls live in `stockResponseSettings`; edit those, `stockCalibrations`, or `orientationToFactors` to tune the behavior. Socket transport does not contain market math.

## stock/2 intent

The Bloomberg-inspired experiment is a compact market workstation built from distinct function screens rather than a generic dashboard. It preserves the Terminal's command grammar, dense hierarchy, tabular typography, numbered actions, and semantic color without using Bloomberg branding.

The default `HOME` screen is an integrated market dashboard combining an equity monitor, selected-security candlestick/volume study, market-moving news, breadth, and the next economic release. Supported command tokens include a listed ticker plus `HOME`, `WEI`, `GP`, `TOP`, or `ECO`. `WEI` renders regional world-index tables, `GP` renders the expanded price study and security statistics, `TOP` renders ranked editorial sections, and `ECO` renders an economic release calendar. Selecting a security in `HOME` or `GP` updates the price study. The layout fills the viewport and scales its internal type, spacing, tables, chart, and visibility rules with the same responsive system as the outer frame.

The discarded prototype system must not be restored. Research evidence and design rationale live in [stock-research.md](./stock-research.md).
