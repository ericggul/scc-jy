# Macro economy — four-institution relational instrument

Routes are `/network-system/macro-economy/controller`, `screen/1`–`screen/4`, and `screen/whole`. This is a signed four-state dynamics study, not a calibrated forecast or policy model. It tests how a local shock reappears, with changed sign, magnitude, and timing, across Central Bank (`M`), Treasury (`F`), Commercial Banks (`C`), and Private Economy (`P`). The prior reaction-diffusion work was set aside because its gesture-to-effect and cross-screen relation were not legible; that is not a general rejection of diffusion.

## Model and boundaries

`dx_i/dt = adjustment_i × (baseline_i − x_i) + Σ[w_(j→i) × a_(j→i) × tanh(x_j)]`. The 12 directed coefficients are: `M→F −.38`, `F→M +.30`, `M→C −.62`, `C→M +.18`, `M→P −.42`, `P→M +.48`, `F→C +.22`, `C→F +.12`, `F→P +.58`, `P→F −.30`, `C→P +.65`, `P→C +.34`. They are declared relative relations, not empirical estimates. Sources for the narrow institutional grounding: [Bank of England](https://www.bankofengland.co.uk/quarterly-bulletin/2014/q1/money-creation-in-the-modern-economy), [ECB](https://www.ecb.europa.eu/mopo/intro/transmission/html/index.en.html), [IMF GFS](https://data.imf.org/en/Datasets/GFS_SFCP).

The server ticks at 100ms and broadcasts only abstract state, histories, directed weights, flows, interventions, revision and time—never presentation. Shocks are one-time node additions; each direction is independently persistent in `[0.10, 10.00]`. Node states are intentionally not hard-clamped; intervention amount remains `[-1,1]`. Reset restores initial states, all weights `1.00`, zero flows, flat histories, revision zero, and a new `runId` atomically.

Client display transforms are Policy Rate `3.50+2M%`, Net Fiscal Flow `2+4F% GDP`, Credit Growth `4+8C% YoY`, Demand Growth `3+6P% YoY`; these are experimental operational units. Fixed trace references are respectively `0–6`, `0–6`, `0–12`, `0–9`; overflow may draw outside the trace row without reflow. Trend colour is duplicated by `RISING/FALLING/STEADY` and `Δ 1s` text.

## Interaction and screen contract

Controller node upper/lower sectors inject `+/-` shocks. Every physical K4 pair exposes two separated directed controls; changing one never changes its reverse. `RESET SYSTEM` calls the authoritative server and is disabled while disconnected.

Each numbered screen is its own responsive, non-scrollable full-screen composition. `whole` renders exactly that wrapper/DOM/CSS at 200% in each 2×2 cell, scaled uniformly to .5 from top left: no alternate breakpoint, aspect ratio, hidden content, or condensed layout. The cell wrapper owns placement/scale only.

Keep model, graph, presenter, wrapper registry, wrappers, socket model/runtime, and screen observation separate. The accepted wrapper is neutral and parameter-first: no neon/dark dashboard, glow, fake status, revisions, badges, gauges, or themed node identities. An audit at `dt=.1` found quasi-equilibrium spans `.023–.035`; `+.55` shocks reached all other nodes after ~2.1–8.0s with .046–.134 peak displacement, and directed weight changes altered variation. These are model properties, not economic validation.
