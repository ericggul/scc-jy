# Financial network / 1

Experimental route `/financial-network/1`. A synthetic economy with 20
households, 10 firms, four banks, four investment institutions, a treasury and
a central bank. The subject is dependence on receipts, refinancing and
collateral, not a prediction about a real economy.

## Interface premise

1. **Perceptual job:** identify who owes whom, distinguish that obligation from
   money actually paid, and follow the effect of interrupted liquidity.
2. **Identity:** actor names and economic roles remain visible. Placement groups
   households with their employer around a local bank; shared institutions
   connect those communities. Shape
   reinforces role; it never replaces the name.
3. **Relations:** directed, typed edges. Payment direction means payer to payee;
   debt direction means debtor to creditor. Deposits therefore point from bank
   to depositor. A financing facility is potential capacity, not a fictitious
   payment. Every displayed relation carries its type and numeric model amount; line width encodes that same quantity. Hover is supplementary, never required to identify the obligation.
4. **Action:** selecting a node locks liquidity; selecting again releases it.
   Several locks can coexist. Hover/focus isolates a participant's relations.
   Release-all removes shocks; reset restores the initial ledger. They are not
   interchangeable. Payment/debt views distinguish flows from outstanding stocks. Debt is the
   initial view. No moving particles or decorative moving dashes stand in for
   money. Central-bank facilities remain connected in both views, with an
   explicitly conditional capacity, distinct from actual disbursement.
5. **Access:** keyboard-operable nodes, visible focus and pressed state; reduced
   motion disables autonomous updates and allows manual stepping. Small screens
   retain readable labels through graph navigation rather than shrinking the
   whole economy into illegible text.

## Representation decisions

The initial anonymous particle-cluster rendering was rejected on 2026-09-10.
It hid actor identity and did not explain the financial meaning of its lines.
Do not restore it or treat attractor aesthetics as the meaning of this system.
Minimal text means removing narration, not names, relation types or directions.

Repository examples are evidence about representations, not skins to copy:

- [Page rank](../page-rank/README.md): the graph remains the object; importance
  is computed state, distinct from layout and direct manipulation.
- [Chess / 3](../../standalone/chess/README.md): even when spatial coordinates
  change, piece identity, legal relations and semantic endpoints survive.
- [Network-system](../../network-system/): signed influence, actor obligations
  and actual payments must not be conflated just because each can use an edge.

A claim must remain visible when its payment stops. A selected-node count must
never trigger collapse. Failure is a result of the ledger and local constraints,
not an animation. Show only model-supported relations and amounts; do not add
fake mortgages or bond holdings for visual completeness.

## Ownership and model

`1/model/` owns deterministic state; [model notes](model.md) own assumptions and
model checks. `1/rendering/` owns graph geometry and semantic presentation;
`1/index.tsx` owns interaction and lifecycle. The adjacent registry is discovered
by the complex-systems index. This version has no socket dependency.

Mechanism references:

- [Gai–Kapadia](https://www.bankofengland.co.uk/working-paper/2010/contagion-in-financial-networks):
  connectivity and financial contagion.
- [Cifuentes–Ferrucci–Shin](https://www.bankofengland.co.uk/working-paper/2005/liquidity-risk-and-contagion):
  asset sales, prices and balance-sheet constraints.
- [Eisenberg–Noe](https://ms.mcmaster.ca/tom/Research%20Papers/EiseNoe01.pdf):
  bilateral obligations and limited payment capacity; this is not their exact
  simultaneous-clearing algorithm.

## Verification boundary

Only pure model tests and scoped static checks are authorized in this work.
No server start, browser test or visual runtime inspection has been performed.
Do not describe source inspection as evidence of rendered quality. Keep
animation at or below 24 Hz and suspend it while hidden or reduced-motion.
