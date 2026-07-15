# Network System/Cycle — Network Macroeconomy Research Synthesis

## Concept restatement

The target is a compact, directed, adjustable macroeconomic network whose own
feedback structure can move among equilibrium, damped oscillation, persistent
cycles, amplification and crisis-like contraction. It should be economically
recognizable and dynamically rich, but it is an interactive systems model—not a
forecast, a calibrated policy model or a claim that one graph is the economy.

`network-system/cycle` must own this model completely. The existing
`network-system/macro-economy` equations, socket room, events, controller and
screens remain unchanged.

## Discipline map and source coverage

The research combines six directly relevant bodies of work:

1. Nonlinear business-cycle models: multiplier-accelerator, inventory cycles,
   Goodwin wage-employment cycles and Minsky/Keen debt instability.
2. Stock-flow consistent macroeconomics: sector balance sheets, income flows,
   endogenous credit and accounting constraints.
3. Agent-based macroeconomics: heterogeneous adjustment rules and emergent
   aggregate regimes.
4. Production networks: directed input dependencies, centrality, bottlenecks
   and shock propagation.
5. Financial networks and financial accelerators: leverage, borrower net worth,
   credit supply and non-monotonic effects of connectivity.
6. Empirical measurement: input-output tables, sector financial accounts,
   credit gaps, employment, prices, output and policy rates.

The source ledger contains 110 distinct sources: 59 peer-reviewed research
articles, 11 reviews or handbook treatments, 8 academic books or chapters, 15
official datasets/databases, an international accounting standard, central-bank
and institutional working papers, and two research-simulation tools. It has 108
tier-A and 2 tier-B sources, no tier-C/D sources, and passes the research-mapper
ledger validator. The mix intentionally favors economic mechanisms, datasets
and modeling methods over art-history precedents because the explicit question
is which macroeconomic network to build.

Full ledger: `docs/research/network-system-cycle-source-ledger.csv`.

## Findings from the literature

### A graph alone does not generate a meaningful business cycle

Production-network research establishes that directed topology changes how
sector shocks aggregate, but a static input-output graph does not by itself
produce the desired recurring motion. The model needs stocks, adjustment delays
and feedback loops. Inventory-cycle research supplies a fast balancing loop;
Goodwin-type labor dynamics supplies a slower distribution-demand loop;
financial-accelerator research supplies a reinforcing investment-credit loop;
and inflation-policy feedback supplies a delayed stabilizer.

### Realism comes from identities and timescales, not the number of labels

SFC research is valuable here as a constraint: production, sales, inventories,
wages, consumption, investment and credit cannot all move independently. A
small model can remain legible if at least the inventory identity and the main
income/credit relations are explicit. A larger collection of institution names
without those constraints would be less realistic than a smaller variable
network.

### The most interesting edge weights have non-monotonic consequences

Financial-network work repeatedly shows that connectivity may absorb small
shocks yet transmit large ones. Nonlinear macro-financial models similarly show
quiet regions and crisis regions within one system. The controller should
therefore change causal gains while preserving each edge's declared sign. It
should not directly select a visual mode such as `OSCILLATION` or `CRISIS`.

### Multiple timescales are required

- Sales and inventory depletion respond fastest.
- Production and employment adjust over intermediate periods.
- Wages, investment and bank credit adjust more slowly.
- Inflation and policy react with delay.

If every node shares one Euler coefficient, the graph tends to look like a set
of simultaneous filters. Distinct time constants allow phase lags, overshoot,
damped cycles and loop competition.

## Candidate node sets

### Six-node minimum — rejected

`Demand, Production, Labor Income, Investment, Credit, Policy/Prices` is compact,
but it merges inflation with policy and hides inventories. Those mergers remove
two of the clearest balancing loops and make edge meanings ambiguous.

### Nine-node mesoscopic model — recommended

1. **HOUSEHOLD DEMAND** — real consumption/order pressure.
2. **PRODUCTION** — real output/activity level.
3. **INVENTORIES** — inventory relative to desired sales coverage.
4. **EMPLOYMENT** — employment/utilization pressure.
5. **WAGE SHARE** — labor-income share and wage pressure.
6. **INVESTMENT** — real capital expenditure/order flow.
7. **CREDIT** — availability/growth of bank credit; positive means easier.
8. **INFLATION** — price-growth pressure.
9. **POLICY RATE** — monetary tightness relative to neutral.

This is large enough to contain the core cycle mechanisms but small enough for
one controller graph and one observable per node. Government demand, housing,
foreign trade and multiple industries remain possible later modules rather than
being compressed into misleading v1 nodes.

### Twelve-plus sector/agent model — deferred

A full household-firm-bank-government-central-bank SFC/ABM would improve sector
accounting and distributional detail, but would require multiple state variables
per sector and a different controller grammar. Adding those labels now would
increase implementation complexity without guaranteeing more legible dynamics.

## Recommended directed graph

All adjustable weights are non-negative multipliers on fixed, documented causal
signs. Setting a weight to zero removes the channel; increasing it strengthens
the same economic relationship rather than changing its meaning.

| From → To | Sign | Economic channel | Relative speed |
| --- | ---: | --- | --- |
| Household Demand → Production | + | firms answer sustained orders | fast |
| Production → Inventories | + | output not yet sold adds stock | immediate |
| Household Demand → Inventories | − | sales deplete stock | immediate |
| Inventories → Production | − | excess stock causes production cuts | medium |
| Production → Employment | + | output requires labor | medium |
| Employment → Wage Share | + | tighter labor markets raise wage pressure | slow |
| Employment → Household Demand | + | employment raises labor income | medium |
| Wage Share → Household Demand | + | labor income has a high consumption propensity | medium |
| Wage Share → Investment | − | a profit squeeze restrains investment | medium |
| Production → Investment | + | accelerator/profit expectations | medium |
| Credit → Investment | + | financing supports capital expenditure | medium |
| Production → Credit | + | activity and cash flow improve lending conditions | slow |
| Credit → Household Demand | + | consumer credit relaxes spending constraints | medium |
| Investment → Production | + | capital orders and later capacity raise output | slow |
| Investment → Employment | + | capital projects add labor demand | slow |
| Household Demand → Inflation | + | demand pressure raises prices | medium |
| Wage Share → Inflation | + | unit labor-cost pressure passes into prices | medium |
| Inflation → Household Demand | − | price growth erodes real purchasing power | medium |
| Inflation → Policy Rate | + | policy reacts to inflation | slow |
| Production → Policy Rate | + | policy also reacts to excess activity | slow |
| Policy Rate → Credit | − | tighter policy restricts credit availability | slow |
| Policy Rate → Investment | − | financing costs reduce investment | medium |

## Dynamic structure

### State convention

Each state is a dimensionless gap around a declared reference level. The UI may
present it in familiar units, but no display unit is treated as measured data.
The server owns only abstract states, stocks, flows, histories, weights and time.

### Equation family

Most nodes use a first-order adjustment equation with a node-specific time
constant:

`dxᵢ/dt = (targetᵢ(x, W) − xᵢ) / τᵢ`

`targetᵢ` is the sum of baseline restoration and signed, saturated incoming
effects. Edge strength is `declaredCoefficient × participantWeight`; weights do
not alter signs. Saturation prevents one strong loop from causing purely
numerical explosion while still allowing large departures.

Inventories use an explicit balance relation rather than a generic target:

`dInventories/dt = production − sales − inventoryAdjustment`

Policy uses a delayed Taylor-style response to inflation and production.
Credit includes a nonlinear risk term so easy-credit amplification weakens and
then reverses when leverage/activity moves too far from the viable region. This
is the minimum nonlinearity needed for a calm region and a fragility region.

### Expected regimes

- **Stable equilibrium:** low loop gains and adequate inventory/policy damping.
- **Damped oscillation:** inventory overshoot creates complex eigenvalues with
  negative real parts.
- **Persistent cycle:** wage-demand, inventory and accelerator loops balance near
  a nonlinear limit cycle.
- **Boom-bust:** strong credit-investment-output feedback outruns delayed policy,
  then the nonlinear credit-risk term reverses the expansion.
- **Suppressed economy:** excessive policy or inventory damping holds production,
  employment and investment below reference.

These regimes are model outcomes. The server never broadcasts regime labels and
the controller never contains a mode switch.

## Simulation and video observable

Use one real second as one simulated quarter. At the existing 100 ms server tick,
`dt = 0.025` simulated years. This gives inventory effects seconds-long visual
lags and financial/policy effects tens-of-seconds arcs without inserting pauses.

The node-edge economy is the primary system. GDP growth is one of its derived
aggregate outputs, and the paired video field is a primary observer of that
output—not a separate visual effect and not a direct node control. The causal
chain is:

`node states + directed edge weights → economic dynamics → GDP growth → video counts`

GDP must therefore combine the system's real activity consistently. Production
is the value-added/output level, Household Demand and Investment are expenditure
flows that move it, Inventories reconcile production and sales, and labor,
credit, inflation and policy alter those flows through the declared edges. The
video pair derives **real GDP growth** from the resulting Production history:

`annualGrowth = 100 × (log(outputNow) − log(outputFourSecondsAgo))`

The production state must therefore map to a strictly positive level before the
log difference. The left/right count mapping can keep its configurable `N × N`
grid. Positive GDP growth activates the left beef-video field; negative GDP
growth activates the right diving-video field; zero growth activates neither.
Magnitude controls the number of active cells. The positive and negative
reference ranges must be retuned using model audits rather than inheriting the
old `+9/−3` display coordinates.

## Isolation and implementation consequences

- Add `socket/experiments/network-system/cycle/model.mjs`; it must not import the macro-economy model.
- Add cycle-owned TypeScript snapshot, node, edge and intervention types.
- Replace the cycle wrapper around the macro controller with a cycle controller
  built from its nine-node registry.
- Replace cycle numbered institution routes with nine numbered variable routes,
  while retaining `left`, `right` and video-only `whole`.
- Preserve `network-system-cycle:*` events and
  `experiment:network-system:cycle` room.
- Do not change any file under `components/network-system/macro-economy/` or
  `socket/experiments/network-system/macro-economy/*` during model replacement.

## Verification requirements

1. Accounting: inventory changes equal modeled production minus sales and
   adjustment to numerical tolerance.
2. Directed controls: changing one weight changes exactly one directed channel.
3. Persistence: weights survive ordinary ticks and reset only on explicit reset.
4. Isolation: no cycle event, room, type or model import depends on macro-economy.
5. Finite long run: baseline and stressed runs remain finite for the supported
   weight domain.
6. Regime audit: parameter fixtures demonstrate equilibrium, damped oscillation,
   persistent cycling and boom-bust using numerical diagnostics, not screenshots.
7. Propagation: a shock to every node produces delayed, non-zero effects through
   every reachable downstream path.
8. Observable: GDP-growth calculation uses Production history and video counts
   update from that derived value.
9. Presentation invariant: the socket broadcasts no color, opacity, geometry,
   active-cell or regime-label state.

## Strong, partial and speculative bridges

- **Strong:** inventories, accelerator investment, credit amplification,
  wage-employment feedback, inflation-policy response, directed production and
  financial transmission.
- **Partial:** reducing heterogeneous households, firms and banks to nine macro
  states. This is a mesoscopic instrument, not an ABM.
- **Speculative:** treating participant-adjusted edge gains as an experiential
  analogue of institutional or structural change. The mapping is useful but not
  an empirically identified policy intervention.

## Open questions for implementation audit

- Which default weights place the untouched model just inside a stable or weakly
  damped regime?
- How large should the supported weight range be so participants can cross a
  bifurcation without producing numerical blow-up?
- Should the nonlinear credit-risk reversal depend on credit alone or on a
  credit-to-production ratio?
- Which output-growth reference bounds produce legible but non-saturated video
  counts across all audited regimes?
