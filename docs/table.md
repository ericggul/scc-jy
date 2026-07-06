# Table Experiment

Routes:

- `/table`
- `/table/1`

Files:

- `app/table/page.tsx`
- `app/table/[experiment]/page.tsx`
- `components/table/experiments.ts`
- `components/table/1/index.tsx`
- `components/table/1/data.ts`

Intent:

`/table/1` is a minimal 10 by 10 logo table.

Current verification target:

- 100 total cells.
- 100 unique brand names.
- 10 rows and 10 columns.
- Every logo renders from an SVG path source.
- No text/wordmark fallback cells.

Logo data:

- Uses `simple-icons` package paths where available.
- Uses a custom embedded SVG path only when explicitly present in `components/table/1/data.ts`.
