# Stock Experiment

Routes:

- `/stock`
- `/stock/1`
- `/stock/2`
- `/stock/3`
- `/stock/4`
- `/stock/5`

Files:

- `app/stock/page.tsx`
- `app/stock/[experiment]/page.tsx`
- `components/stock/experiments.ts`
- `components/stock/data.ts`
- `components/stock/primitives.tsx`
- `components/stock/[1-5]/index.tsx`

Intent:

Stock contains numbered interface studies around market/data display patterns.

Implementation rule:

- Shared stock primitives stay in `components/stock/primitives.tsx`.
- Shared stock data stays in `components/stock/data.ts`.
- Variants stay under `components/stock/[variant]/`.
