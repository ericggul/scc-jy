# Barrier advertisement

Experimental, 2026-09-08. The campaign is preserved at `/barrier/default`; `/barrier/1` is an independent grid study.

`default`: full-screen M/3 Barrier Cream product still life with the campaign copy. Rubbing the cream controls its reveal; the native range input preserves the same parameter for keyboard users.

`1`: 25 independent mini advertisements. Each cell has distinct fictional brand/product names, a three-line Korean copy, three named cosmetic ingredients and a volume; both the jar label and revealed formula use that cell's data. Every cell contains a `100vw × 100vh` ad coordinate system scaled by `1 / GRID_SIZE`, keeping product photograph, copy, formula reveal, direct rub surface and native range UI proportionate inside `20vw × 20vh`. `GRID_SIZE = 5` derives count, cell dimensions and internal scale together. The red background, `difference` blend treatment, zoom range and zoom readout were removed from this variant.

Each cell has one independent deterministic maximum in `1.50×–4.00×`; its product photo pulses from `1.00×` to that cell-specific maximum. Each completed pulse schedules a new random `0.2–0.5s` pause and duration through direct style updates, avoiding React state updates across the 25 cells. Initial negative delays desynchronize the field; reduced-motion disables automatic pulses while retaining direct cell controls.

`2`: an independent `N = 10` clone with 100 cells at `10vw × 10vh`, each containing the same scaled ad UI and independent pulse. Twenty-five product/brand/ingredient sets recur across the field, while a 10×10 composition of copy openings, middle phrases and closing phrases makes all 100 three-line campaigns distinct. A mouse position activates its underlying cell at `5.00×`; surrounding cells decay exponentially over four grid units. The field only updates when the pointer crosses a cell boundary, then uses CSS transform transitions for the delayed, elastic settle. Direct rub and range controls within each ad remain intact.

The previous runner was explicitly rejected by the user for failing to read as cosmetic advertising. Its game implementation and tests were removed; the route and registry remain. The current relation is touching a cosmetic texture to reveal the campaign's composition message. This is a visual metaphor, not a skin or formulation simulation.

Asset: `apps/scc/public/barrier/product-cream.png`, generated with the built-in image tool. Prompt: “One unbranded frosted translucent cream jar, with an ivory cap behind it; a thick silk-white moisturizer cream ribbon travels across the foreground and carries three tiny ivory, pale gold and soft olive beads. Clean warm-white studio with quiet negative space on the left. Ultra-real luxury skincare photography; no labels, text, people or decorative objects.”

Image inspected directly. Browser appearance and touch ergonomics remain unverified under repository policy.
