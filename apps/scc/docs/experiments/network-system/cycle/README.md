# Network system / Cycle

Cycle is an isolated nine-node macro-dynamics experiment: household demand, production, inventories, employment, wage share, investment, credit, inflation, and policy rate. It does not use the older macro-economy model or runtime.

## Model and video mapping

| Item | Contract |
| --- | --- |
| Edges | 22 directed edges; solid positive, dashed negative; each changes by `.5` in `[0,20]`. |
| Time | One real second is one simulated quarter; server advances `dt=.025` every 100ms. |
| Output | `outputLevel=100exp(.08production)`; annualized `gdpGrowth=100[ln(outputNow)-ln(outputFourSecondsAgo)]`. |
| Count | Positive growth selects beef/left, negative diving/right; `activeCount=ceil(abs(gdpGrowth))`, `N=ceil(sqrt(count))`. |
| Bound | No authored boom/recession state or 3% cap; tests permit roughly -62% to +62%. |

Cells fill row-major. Each pane has one decoder, does not restart on resize, and draws the frame across contiguous active runs. Left uses `/video/left.mp4`, seconds 5–15; right uses `/video/right.mp4`, seconds 65–74. A side restarts at its segment only on zero→active and is audible only while active.

## Screen contracts

| Screen | What it derives | Keep / avoid |
| --- | --- | --- |
| News | Repeating node lanes, immutable three-item buffers, authored sector/regime templates; target speed `500px/s/unit`, 20px/s floor below `.04`. | New text enters from the right; do not rewrite visible items. |
| Employment | 112-family field: `ceil(clamp((.03-current)/.58,0,1)×112)` distressed. | Baseline `.03`; direct controller edge changes remain the cause. |
| Employment 2 | 40×40 rasterized emoji field, 800 smile/800 cry at zero, saturation ±2. | Update changed slots; do not mount 1,600 React elements. |
| Graphs | Nine current/history traces; `graphs-2` translates to consumption, industrial production, inventories, earnings, payrolls, investment, CPI, policy rate, private credit. | `graphs-2` uses fixed-width figures, orange codes, cyan traces, semantic changes and high/low rows—not sessions, badges, or fake connection state. |

Keep outputs field-first and causal, not market-dashboard decoration. Research and source evidence remain in [research.md](research.md) and [source-ledger.csv](source-ledger.csv).

## Boundaries

Cycle uses room `experiment:network-system:cycle` and only `network-system-cycle:` events. Keep abstract state in `model`, socket handling in `transport`, graph interaction in `controller`, media in `media`, outputs in `news`, `employment`, `employment/emoji`, `graphs`, and route composition in `screen`.
