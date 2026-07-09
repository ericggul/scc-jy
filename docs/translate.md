# Translate Experiment

Routes:

- `/translate`
- `/translate/1`
- `/translate/2`
- `/translate/3`

Files:

- `app/translate/page.tsx`
- `app/translate/[experiment]/page.tsx`
- `components/translate/experiments.ts`
- `components/translate/1/index.tsx`
- `components/translate/1/data.ts`
- `components/translate/2/index.tsx`
- `components/translate/2/data.ts`
- `components/translate/3/index.tsx`
- `components/translate/3/data.ts`
- `components/translate/TranslationGrid.tsx`

Intent:

`/translate/1` is a single-screen Korean-to-Japanese translation interface. Korean sentences appear one by one, briefly enter a conversion state, then resolve into Japanese.

`/translate/2` is a 20 by 20 translation grid. It has no language header row. The grid starts empty; clicking a cell toggles that cell's row and column into the active selection set. Visibility is parity-based across every selected row and column: one hit shows a cell, two hits hides it, three hits shows it again, and so on. Clicking an already selected cell removes that row/column contribution and retroactively recalculates the grid.

`/translate/3` extends the same grid behavior to 100 conversations by 100 languages. The first 20 language columns reuse the real-language set from `/translate/2`; the remaining 80 columns are deterministic constructed languages for scale testing.

Interaction:

- Hovering or focusing a sentence row reveals every sentence up to that row in both languages.
- Moving the pointer back upward reduces the reveal range to the newly hovered row.
- Leaving the row returns to the automatic reveal sequence.
- `/translate/2` uses click selection only. Re-clicking an active cell removes that cell from the active selection set.
- `/translate/3` uses the same click, cumulative parity reveal, and toggle-off interaction.

Rules:

- No external translation API.
- No LLM call.
- Keep the interface plain and tool-like.
- The page may scroll horizontally or vertically when the viewport is smaller than the interface.
- Keep `app/translate/[experiment]/page.tsx` as a route switch only. Add experiment implementation and data under `components/translate/[number]/`.
- Shared grid interaction belongs in `components/translate/TranslationGrid.tsx`; per-experiment scale and language data belongs in each numbered data file.
