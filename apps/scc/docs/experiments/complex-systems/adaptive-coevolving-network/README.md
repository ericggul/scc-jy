# Adaptive coevolving networks

The shared question is whether `node state → relation update → future exposure` is visible as one process. These are synthetic, finite browser models—not empirical social or electoral claims.

## Routes

| Route | Model | Participant action | Important boundary |
| --- | --- | --- | --- |
| `/adaptive-coevolving-network/2` | Seeded open N/S/R recruitment graph. Nodes enter/leave; entrants receive two ties; S becomes R from recruiter exposure; recruiters rewire `R–N` to `R–S`. | Press makes nearby N nodes S; sliders set browser rates. | Event chance is `1-exp(-rΔt)`; rates have no empirical unit and population cap is rendering-only. |
| `/adaptive-coevolving-network/3` | Same event family on fixed candidate centres. | Activate a candidate or change an active N to S. | `N×N` immutable grid, default 32 and adjustable 16–50; entry/departure toggles a site rather than creating it. |
| `/adaptive-coevolving-network/polling-ecology` | Synchronous faction/topic/conviction/age field with reproduction, switching, attrition. | Seed a patch. | Explicitly synthetic ecology, not polling evidence. |

The open-route basis is Shkarayev, Schwartz, and Shaw’s [recruitment model](https://doi.org/10.1088/1751-8113/46/24/245003) ([preprint](https://arxiv.org/abs/1111.0964)); [Gross and Blasius](https://doi.org/10.1098/rsif.2007.1229) supplies the broader adaptive-network framing.

## Visible and testable contract

Filled grey, outlined blue, and ringed rust nodes mean N, S, and R. Rust links mean current R–S opportunities; entry rings and endpoint dashes must be caused by real model events. Compact readouts may show N/S/R, `|V|/|E|`, components, and event totals. Do not add a legend, cards, fake-live status, or force-layout motion.

Tests cover deterministic replay, valid endpoints after death, turnover, rewiring endpoint changes, and bounded local intervention. The lattice also asserts exact `N²` candidates and immutable coordinates. A Gillespie queue or measured distance kernel would be a new calibration trial, not an implicit property of these routes.
