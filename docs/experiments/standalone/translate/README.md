# Translate Experiment

Routes:

- `/translate`
- `/translate/1`

Files:

- `app/(standalone)/translate/page.tsx`
- `app/(standalone)/translate/[experiment]/page.tsx`
- `components/standalone/translate/experiments.ts`
- `components/standalone/translate/1/TranslateGridExperiment.tsx`
- `components/standalone/translate/1/data.ts`
- `components/standalone/translate/1/base-data.ts`
- `components/standalone/translate/TranslationGrid.tsx`

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
- Keep `app/(standalone)/translate/[experiment]/page.tsx` as a route switch only. Do not
  create literal route folders such as `app/(standalone)/translate/1` for numbered variants.
- Shared grid interaction belongs in `components/standalone/translate/TranslationGrid.tsx`; per-experiment scale and language data belongs in each numbered data file.
