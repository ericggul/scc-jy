# Void field

`/void/1`–`/void/3` are field-first weighted-attractivity Vicsek variations. A void is temporary absence of local coupling, never a central obstacle. Each stable element has position, heading, and attractivity `a∈[.03,1]`; pair weight is `g(.14+.86(1-d/r)²)(.12+.88√(aᵢaⱼ))`, and next attractivity is smoothed weighted directional coherence. The extension is explicit, not attributed to Vicsek et al. (1995), whose off-lattice periodic, synchronous fixed-speed alignment model is the base ([source](https://doi.org/10.1103/PhysRevLett.75.1226)).

Controls change noise `η`, reach `r`, and gain `g`; defaults `.42`, `.037` of short side, `1`, with `v=.03r`. Relations directly encode admitted pair weight. Retain the unframed white field, three-point heading traces, optional controls, reduced motion, and an `advance` step; omit grids, glow, trajectories, counters and focal icon.

Performance is bounded to 720–2,400 elements, a 3×3-cell spatial hash (`O(N+E)`), retained typed buffers, 24Hz with one catch-up step, DPR ≤1.25 / 3m pixels, and canvas batching. Model checks: seeded 40-step replay, finite 2,400-node/24-step run, unique periodic-seam edges, fixed seam travel, and stronger turning for a high-attractivity pair. Browser performance remains unverified.
