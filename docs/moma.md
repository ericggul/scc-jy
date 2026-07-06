# MoMA Experiment

Routes:

- `/moma`
- `/moma/1`
- `/moma/2`

Files:

- `app/moma/page.tsx`
- `app/moma/[experiment]/page.tsx`
- `components/moma/experiments.ts`
- `components/moma/1/index.tsx`
- `components/moma/1/data.ts`
- `components/moma/2/index.tsx`
- `components/moma/2/data.ts`

Intent:

- `/moma` is only a minimal index.
- `/moma/1` is a scrolling museum homepage study.
- `/moma/2` is a non-scrollable exhibition table interface.

Implementation rule:

- Keep `app/moma` route files thin.
- Put variant UI and data under `components/moma`.
