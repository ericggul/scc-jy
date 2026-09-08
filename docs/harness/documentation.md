# Writing useful repository documentation

Write the smallest document that lets the next agent make the right change.
Keep scope, current behavior, unusual constraints, and evidence; omit narration
of routine steps and repeated warnings. These are editing defaults, not extra
approval gates or a rigid template.

## Put each fact in one place

| Content | Owner |
| --- | --- |
| Shared operational rules and model preferences | Root `AGENTS.md` |
| Task routing | `docs/README.md`, app `docs/README.md`, `llm.txt` |
| Engineering procedure | `docs/harness/` |
| Artwork theory and research | `docs/foundations/` |
| App/feature contract, source ledger, trial, failure | Owning `apps/<app>/docs/` |
| Executable routes, versions, commands | Code/registries/package files; docs explain exceptions |

Link to the owner rather than copying its instructions. Indexes route readers;
they must not require reading every linked file. Read a historical record only
when its subject affects the task. A long source ledger need not become prompt
context for an unrelated fix.

## Edit for action

- Lead with purpose and current status: experimental, maintained, historical,
  proposed, or unverified. Separate current contracts from dated evidence.
- State outcomes and constraints; prescribe low-level steps only when order,
  exact values, or a known failure makes them necessary. Avoid repeated MUSTs,
  roleplay outside explicitly requested wording, and exhaustive generic checks.
- Prefer a short paragraph or parallel list; use a table for mappings. Keep
  runnable commands exact and label user-operated commands that agents cannot
  run. Do not copy verification restrictions into every app record.
- Before adding a rule, search for its existing owner. Replace or reconcile
  that rule; remove obsolete copies and fix incoming links. Resolve conflicts
  using current user intent and code evidence; flag material uncertainty.
- Preserve unique parameters, citations, licenses, acceptance conditions,
  source ledgers, useful failures, and measured results. Label retired paths
  as historical rather than rewriting history as current behavior.
- For a trial, enough is: baseline, changed relation, invariants, result/checks,
  and unresolved issue. Do not add an empty section for each field.
- Report what was actually checked. For doc-only edits, inspect the diff and
  local link targets; application builds and browser tests add no evidence.

Aim for a root policy readable in one pass and reference docs sized to their
job. A 60–70% cut is a useful cleanup target where redundancy exists, not a
reason to delete evidence. Word/byte reductions are measurable; token savings
depend on what the harness actually loads and are not model-performance proof.
