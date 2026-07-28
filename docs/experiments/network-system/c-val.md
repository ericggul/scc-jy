# Network System / C-VAL

## Experience

C-VAL is a multi-device, order-driven financial-market simulation organized
around three participant-controlled conditions:

- volatility controls information shocks, private-valuation dispersion, and
  how defensively liquidity providers quote;
- activity controls how frequently participants submit orders;
- liquidity controls the share, size, and replenishment rate of passive
  supply.

These are market conditions, not three directly assigned outputs. Realized
volatility, trading volume, spread, depth, price impact, and price are measured
from the orders and executions that follow.

The phone still maps calibrated `alpha`, `beta`, and `gamma` deltas directly to
volatility, activity, and liquidity. Values are bounded to `0–1`, shown as
`0–100`, and return to a neutral midpoint when phone events stop.

The public routes are unchanged:

- `/network-system/c-val/mobile`
- `/network-system/c-val/controller`
- `/network-system/c-val/screen/market`
- `/network-system/c-val/screen/news`
- `/network-system/c-val/screen/media`
- `/network-system/c-val/screen/employment`
- `/network-system/c-val/screen/whole`

`news`, `media`, and `employment` retain the shared initial market wrapper.
They do not yet claim to model macroeconomic or social consequences.

## Design contract

1. **Participant situation:** one participant changes market conditions by
   moving a calibrated phone; controller and screen participants observe the
   same market.
2. **Primary relation:** phone motion changes V/A/L; V/A/L alter participant
   behavior; participant orders alter the book; executions form price.
3. **Perceptual job:** a non-expert must be able to see orders arrive, rest,
   trade, consume depth, and be replenished.
4. **Interaction job:** enabling motion begins calibrated input; `ZERO`
   replaces the baseline pose; `RESET` creates a fresh deterministic market
   run.
5. **Wrapper justification:** the controller uses a price ladder because price,
   queue, side, depth, and execution priority are the state that must become
   perceptible. It is not a graph of inferred causal strengths.
6. **System family:** mobile, controller, and screens keep the established
   neutral surfaces, restrained semantic color, compact data typography, and
   absence of decorative system chrome.
7. **Removal test:** the controller keeps only V/A/L conditions, derived market
   outcomes, incoming orders, resting depth, spread, and executions.

The controller's signature element is the real order book: bar width is
derived in the browser from actual resting quantity, and every order and trade
row carries a stable server-created ID. There are no server-authored colors,
widths, animation phases, highlights, or layout instructions.

## Reference class and calibration

The simulation explicitly represents a **liquid, small-tick electronic
equity**, not every financial market. The preset
`liquid-small-tick-equity-v1` uses the AstraZeneca (`AZN`) values reported in
Table 2 of Mike and Farmer's empirical London Stock Exchange model:

- order-sign Hurst exponent `H = 0.77`;
- Student-t order-placement degrees of freedom `1.31`;
- log-price placement scale `0.0024`;
- cancellation parameters `A = 1.12`, `B = 0.20`;
- a small integer tick and a typical 100-share simulation lot.

The source model was fitted to AZN order flow from 2000–2002 and performed well
for the paper's low-volatility, small-tick Group-I stocks. The paper itself
reports weaker performance outside that reference class. C-VAL therefore does
not label these coefficients universal or contemporary exchange estimates.

V/A/L vary bounded scenario ranges around the reference:

- `V` moves placement scale from `0.0012–0.0048`, persistent
  information-pressure scale from `0.15–8` bps, private-valuation
  dispersion, provider quote distance, provider size, cancellation, and
  replenishment risk;
- `A` moves the simulated arrival rate from `6–140` orders per second;
- `L` moves provider participation from `12–72%`, provider order size from
  `100–400` shares, and replenishment probability from `15–92%`.

The 50 ms clock, the `12` market-seconds-per-real-second compression, the
information-pressure half-life, and the order-arrival range are installation
timing or scenario choices rather than empirical exchange calibration. Tail
truncation, book limits, and history limits are tagged as numerical safety.
This distinction is encoded in `calibration.mjs`.

Primary references:

- Szabolcs Mike and J. Doyne Farmer, [An empirical behavioral model of
  liquidity and volatility](https://arxiv.org/abs/0709.0159).
- Rama Cont, Arseniy Kukanov, and Sasha Stoikov, [The Price Impact of Order
  Book Events](https://arxiv.org/abs/1011.6402).
- Rama Cont and Adrien de Larrard, [Price dynamics in a Markovian limit order
  market](https://arxiv.org/abs/1104.4596).

## Market mechanism

The server creates 56 stable participants:

- 12 liquidity providers replenish passive bids and asks while managing
  inventory;
- 12 value traders compare private valuations with the market and use those
  valuations as their actual order limits;
- 8 trend traders change both order direction and aggressiveness in response
  to recent executed-price movement;
- 24 flow traders execute persistent hidden-order sequences, approximating the
  empirically observed long memory of order signs.

Every submitted order has an ID, participant, side, kind, price when limited,
quantity, remaining quantity, and submission time. The matching engine uses an
integer-tick continuous double auction with:

- best-price then FIFO time priority;
- market and marketable-limit execution;
- partial fills;
- multi-level book walking;
- specific-order cancellation;
- bounded passive queues.

Executions transfer shares and cash between the buyer and seller. The last
execution sets market price. The book determines best bid, best ask, spread,
and depth. Rolling executions determine volume, realized volatility, and
observed price impact. Recent submitted quantity determines order-flow
imbalance. No equation directly assigns a return, index, spread, depth,
turnover, or impact value from V/A/L.

Liquidity is therefore a stock that can be consumed and replenished: aggressive
orders remove resting quantity, and providers restore it by submitting new
orders. When volatility rises, providers widen quotes, reduce size, cancel
more readily, and replenish more cautiously. High activity can create high
volume without forcing a directional price move. Equivalent order pressure
tends to move price less when more depth is resting.

Rapid input uses asymmetric state response: the effective volatility regime
rises quickly when V spikes and decays slowly afterward. This represents
volatility clustering and prevents alternating phone motion from averaging
risk immediately back to neutral. Liquidity is not allowed the opposite
one-way memory: when L falls or effective volatility rises, already-resting
provider quotes are actively cancelled toward the new supply regime instead
of leaving high-L depth accumulated in the book.

## Robustness and limits

Pure tests separately verify:

- price-time priority and partial-fill conservation;
- market-order book walking;
- exact cancellation;
- an uncrossed resting book;
- cash and inventory conservation across executions;
- executed-price provenance;
- activity-to-volume sensitivity;
- liquidity-to-depth and impact sensitivity;
- volatility-to-realized-volatility sensitivity;
- deterministic long-run finiteness and bounded payload size.

These establish structural correctness and scenario behavior, not empirical
forecast accuracy. Participant archetypes, inventory constraints, V/A/L
scenario ranges, and time compression remain modeling choices. The model does
not represent auctions, hidden venues, latency races, fees, short selling,
leverage, derivatives, multiple assets, regulatory halts, or a macroeconomy.

## Socket architecture and performance

C-VAL owns one isolated room and event prefix, one shared 50 ms timer, and
separate modules for calibration, matching, market behavior, socket validation,
browser transport, controller presentation, and screen presentation.

Phone messages only replace the latest orientation target. The timer coalesces
input, advances one shared market, and broadcasts only when clients are in the
room. Snapshots contain nine levels per book side, 16 recent orders, 12 recent
trades, and 120 history samples. Internal books and rolling windows are bounded,
so memory and payload size do not grow with runtime.

Only a joined mobile can send orientation. Only a joined controller can reset
the market. Events remain isolated from other experiments.

## Runtime diagnosis

While at least one client is present in the C-VAL room, the socket process emits
one `[c-val:1s]` JSON line per second. Each bounded line aggregates the preceding
second rather than logging individual sensor or order events. It contains:

- V/A/L minimum, maximum, and ending values;
- the effective persistent V regime used by market participants;
- age of the latest phone-orientation event;
- executed-price start, end, range, change from open, and reference value;
- submitted, cancelled, and executed order counts;
- order imbalance, depth, spread, and observed impact.

The diagnostic window is cleared whenever the room becomes inactive or the
controller resets the market. This makes it possible to locate whether a weak
visible response originates in phone input, participant order generation,
execution scarcity, or liquidity absorption without producing sensor-rate log
volume.

The repeatable offline workflow for synthetic and recorded mobile motion is
documented in the [C-VAL mobile-shake verification
harness](./c-val-shake-harness.md).
