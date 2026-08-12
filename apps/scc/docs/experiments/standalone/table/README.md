# Table Experiment

Routes:

- `/table`
- `/table/1`
- `/table/2`

Files:

- `app/(standalone)/table/page.tsx`
- `app/(standalone)/table/[experiment]/page.tsx`
- `components/standalone/table/experiments.ts`
- `components/standalone/table/1/index.tsx`
- `components/standalone/table/1/data.ts`
- `components/standalone/table/2/index.tsx`

Intent:

`/table/1` is a minimal 10 by 10 logo table.

`/table/2` reuses the same stable 100-logo dataset in a full-viewport,
overflowing difference-blend field. Its bottom-left control changes icon scale
and switches between source colors and monochrome without changing the table
records.

Current verification target:

- 100 total cells.
- 100 unique brand names.
- 10 rows and 10 columns.
- Every logo renders from an SVG path source.
- No text/wordmark fallback cells.

Logo data:

- Uses `simple-icons` package paths where available.
- Uses a custom embedded SVG path only when explicitly present in `components/standalone/table/1/data.ts`.
