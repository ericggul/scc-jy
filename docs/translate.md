# Translate Experiment

Routes:

- `/translate`
- `/translate/1`

Files:

- `app/translate/page.tsx`
- `app/translate/1/page.tsx`
- `components/translate/experiments.ts`
- `components/translate/1/TranslateGridExperiment.tsx`
- `components/translate/1/data.ts`
- `components/translate/1/base-data.ts`
- `components/translate/TranslationGrid.tsx`

Intent:

`/translate/1` is the retained 100 conversations by 100 languages translation
grid. Its first 20 language columns use the real-language base data; the
remaining 80 columns are deterministic constructed languages for scale testing.

Interaction:

- Clicking a cell toggles that cell's row and column into the active selection set.
- Visibility is parity-based across every selected row and column: one hit shows a cell, two hits hides it, three hits shows it again, and so on.
- Re-clicking an active cell removes that cell from the active selection set and retroactively recalculates the grid.

Rules:

- No external translation API.
- No LLM call.
- Keep the interface plain and tool-like.
- The page may scroll horizontally or vertically when the viewport is smaller than the interface.
- Shared grid interaction belongs in `components/translate/TranslationGrid.tsx`; per-experiment scale and language data belongs in each numbered data file.
