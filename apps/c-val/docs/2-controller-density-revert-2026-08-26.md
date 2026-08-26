# Reverted controller-density attempt — 2026-08-26

Status: fully reverted in the same turn.

What was attempted:

- capped the controller root type scale at `15.706px` for 2560-wide frames;
- replaced the explicit aspect-ratio row counts with `ResizeObserver`-measured
  row capacity; and
- raised server retention to 40 orders, 40 trades, and 20 book levels.

Why it failed:

- The root type size also controls the controller's `em`-based chrome, panel
  headers, summaries, and row geometry. Capping it changed the agreed laptop
  composition; freed height flowed into panel bodies instead of preserving the
  reference proportions.
- The measured capacity was coupled to those already-changed body heights. At
  2560×1664 it produced 32 order rows and 28 trade rows, so the layout was no
  longer the agreed explicit density trial.
- The running socket still supplied 24 trades until a restart. The 28-row list
  therefore showed four empty rows, not four additional real executions.

Rule for the next trial: preserve the root type scale and all non-target panel
geometry. Change only the requested table's explicit row count and its server
history limit, then inspect that one change before widening the scope.
