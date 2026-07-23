# MoMA Experiment

Routes:

- `/moma`
- `/moma/1`
- `/moma/2`

Files:

- `app/(standalone)/moma/page.tsx`
- `app/(standalone)/moma/[experiment]/page.tsx`
- `components/standalone/moma/experiments.ts`
- `components/standalone/moma/1/index.tsx`
- `components/standalone/moma/1/data.ts`
- `components/standalone/moma/2/index.tsx`
- `components/standalone/moma/2/data.ts`

Intent:

- `/moma` is only a minimal index.
- `/moma/1` is a scrolling museum homepage study.
- `/moma/2` is a non-scrollable exhibition table interface.

Implementation rule:

- Keep `app/(standalone)/moma` route files thin.
- Put variant UI and data under `components/standalone/moma`.
