# Stock experiments

Agents changing the stock data model or device behavior must first read
[stock-ui-preservation-postmortem.md](./stock-ui-preservation-postmortem.md).

Routes:

- `/stock`
- `/stock/default`
- `/stock/1/mobile`
- `/stock/1/screen`
- `/stock/2`

## Structure

- `app/stock/page.tsx` is the minimal experiment index.
- `app/stock/[experiment]/page.tsx` owns direct/default routing only.
- `app/stock/[experiment]/mobile/page.tsx` and `screen/[experiment]/page.tsx` are the expandable role routes.
- `components/stock/experiments.ts` is the route registry.
- `components/stock/default/dashboard.tsx` and `historical-data.ts` preserve the original standalone graph stack and data.
- `components/stock/1/mobile.tsx` captures device orientation and emits stock-only signals.
- `components/stock/1/screen.tsx` owns the shared live market clock.
- `components/stock/default/dashboard.tsx` also exposes the reusable graph surface consumed by the live screen.
- `components/stock/1/axis-model.ts` owns the exact axis-to-slope integration and rolling samples.
- `components/stock/1/use-stock-socket.ts` owns the client socket contract.
- `socket/experiments/stock/index.mjs` owns the isolated `stock:*` room and events.
- `components/stock/2/index.tsx` is the interactive Bloomberg-inspired terminal.
- `components/stock/2/data.ts` owns stable market, index, and headline records.
- `components/stock/2/terminal.module.css` owns the fixed-format responsive workstation styling.

## stock/1 signal model

The mobile zeroes `alpha`, `beta`, and `gamma` against the device pose captured when motion starts, then sends signed deltas. `ZERO` recalibrates that pose. The screen contains exactly three synthetic stocks, `ALPHA`, `BETA`, and `GAMMA`, each initialized at `100.00`.

An axis value is shown directly as that stock's securities percentage change while it controls price direction against the initial 100-point basis. The internal market clock runs at 2x real time so price and chart motion react decisively without adding stochastic gain or cross-axis coupling. Axes never affect one another. Prices have no upper or lower cap: they continue through `1000.00`, `0.00`, and negative values. When mobile events stop, the last value is held for 100ms and then linearly released to zero over 180ms.

The charts retain 2.5 real seconds of samples, equivalent to five seconds at the accelerated market clock. Samples are captured every 25ms and mobile events are emitted at up to roughly 60Hz. Each y-domain expands quickly to include new extrema and contracts slowly after extrema leave, with a guaranteed visible margin. Integration and range constants are centralized in `axisMarketSettings`; socket transport contains no price mathematics.

## stock/2 intent

The Bloomberg-inspired experiment is a compact market workstation built from distinct function screens rather than a generic dashboard. It preserves the Terminal's command grammar, dense hierarchy, tabular typography, numbered actions, and semantic color without using Bloomberg branding.

The default `HOME` screen is an integrated market dashboard combining an equity monitor, selected-security candlestick/volume study, market-moving news, breadth, and the next economic release. Supported command tokens include a listed ticker plus `HOME`, `WEI`, `GP`, `TOP`, or `ECO`. `WEI` renders regional world-index tables, `GP` renders the expanded price study and security statistics, `TOP` renders ranked editorial sections, and `ECO` renders an economic release calendar. Selecting a security in `HOME` or `GP` updates the price study. The layout fills the viewport and scales its internal type, spacing, tables, chart, and visibility rules with the same responsive system as the outer frame.

The discarded prototype system must not be restored. Research evidence and design rationale live in [stock-research.md](./stock-research.md).
