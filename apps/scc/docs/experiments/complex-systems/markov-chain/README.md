# Markov chain experiment

Route: `/markov-chain/1`, owned by the filesystem-only `complex-systems`
group.

Date: 2026-08-13.

## Interface premise

1. **Participant situation:** one person studies how an intentionally displaced
   population relaxes through a finite transition kernel and may re-seed a
   portion of that population at any site.
2. **Primary parameter:** the joint chain state
   `X_t = (site, tendency, regime)`, rather than site alone.
3. **Perceptual job:** see sampled site mass leave a local disturbance, move
   through directed paths, and approach the stationary site distribution.
4. **Interaction job:** press a site to inject 58% of the sampled population
   there; pause, advance exactly one transition, set the transition rate, or
   reset the initial condition.
5. **Wrapper justification:** a single spatial field makes the graph, its
   non-reversible flow, the empirical population, a witness trajectory, and
   the stationary reference part of the same observation. The lower readout
   exposes the selected state kernel only where its probabilities support that
   observation.
6. **System family:** cool mineral ground, charcoal sample mass, blue-grey
   reference and witnessed movement, serif title, and monospaced notation and
   controls match the complex-systems family.
7. **Removal test:** the sites, directed relations, empirical sample,
   stationary contours, selected-kernel readout, and intervention controls are
   necessary. A dashboard shell, generic charts, fake live state, separate
   explanatory panels, and decorative technical graphics are omitted.

## Bounded trial

- **Baseline:** the SCC full-viewport complex-systems simulation grammar. No
  prior Markov-chain route exists in the archive.
- **Changed variable:** a spatial graph is made into a proper first-order
  Markov process by carrying movement tendency and a persistent regime in the
  state. A site-only view would conceal those variables and is generally not
  Markovian for this transition rule.
- **Model:** 12 sites × 3 tendencies × 3 regimes = 108 joint states. Regime
  changes use a strictly positive 3×3 row-stochastic matrix. At every site,
  6.5% of each row stays in place: 3.5% retains the current tendency and 3.0%
  retunes it. The directed outer orbit plus bridges connect every site. The
  resulting finite chain is irreducible, aperiodic, and non-reversible; its
  stationary distribution is calculated with power iteration, not estimated
  from the visible walkers.
- **Retained invariants:** no socket dependency, a single viewport, local
  direct intervention, model-layer state and transition calculations, and no
  presentation state in the model.
- **Observable result:** a 1,360-walker Monte Carlo sample can be concentrated
  at any site. The `TV(site, π)` readout tracks the total-variation distance
  between the sampled and exact stationary site marginals. Blue reference
  rings are the exact marginal; charcoal circles and nearby dots are sampled
  mass.
- **Unresolved question:** should a later branch change only the regime
  transition matrix to make metastable cross-site residence perceptible while
  keeping the site graph and display invariant?
