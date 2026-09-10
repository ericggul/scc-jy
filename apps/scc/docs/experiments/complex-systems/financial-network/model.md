# Financial network / 1 model

The pure model contains 20 households, 10 firms, four banks, four funds, a
treasury and a central bank. It is a deterministic teaching instrument, not a
calibrated economy, forecast, market-price model, or implementation of a legal
resolution regime.

`cash` is a deposit balance for non-banks and a reserve balance for banks.
Ordinary payments transfer existing deposits. Firm credit is the only
money-creation operation: it creates a firm's deposit and a matching bank loan;
principal repayment extinguishes both. No household loan is created or expanded.
Every loan edge runs from the firm debtor to its bank creditor, and its
`principal` is the remaining claim.

Banks begin with equal finite capital of 90. A firm's secured credit capacity
uses 88% of its marked collateral less existing debt. Per model second, 6% of
principal matures (synthetic time, not an annualized real-world rate); collateral below that 88% loan-to-value boundary produces an
additional margin-call component. A lender can roll only paid principal through
its reserve, capital, credit-limit and freeze constraints. Thus a payment freeze
is not itself a failure rule: it first restricts spendable cash, then can cause
missed wages, arrears, refinancing gaps, collateral seizure and a price-sensitive
sale to funds. No condition counts selected nodes.

Each bank pays the interest it actually receives as dividends to households whose
employers use that bank. In the undisturbed baseline that mapping closes the
normal wage, consumption, tax, procurement and debt-service circuit without an
outside injection. The 10,000-period pure test checks every household and firm
cash balance stays within 1% of its own initial balance, every loan principal is
unchanged, central-bank cash is unchanged, no loan arrears accrue and no node
defaults. A short single-firm freeze is released and recovered; a sustained,
mixed selection must reduce the observed wage flow from unselected `firm-5` to
unselected `household-9`, showing connected propagation rather than a selected
node-count trigger.

The public-bill edges deliberately model only matched same-period rollover cash
flows between each fund and the treasury. They do **not** record an outstanding
bill stock, bill ownership as a balance-sheet asset, issuance pricing, maturity
ladder, or a Treasury solvency constraint. They must not be read as complete
government-debt accounting. The central-bank backstop is likewise a bounded loan
against bank loans, not QE or a policy reaction function.

Collateral sales transfer collateral only after a fund transfers its own cash;
unsold units remain on the bank's balance sheet at the endogenous fire-sale
price. The model omits an interbank market, deposit insurance heterogeneity,
bank runs, bankruptcy court, portfolio choice, heterogeneous loan maturities and
empirical calibration. Its accounting check verifies each bank's modeled assets
less deposits and public-backstop debt equals equity; it is not an external
audit.
