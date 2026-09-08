# Harness review — 2026-09-08

Scope: repository policy, shared harness/foundations, and all four app docs
trees. This is a dated decision record, not additional mandatory instructions.

## Evidence and limits

OpenAI's [Astra guidance](https://developers.openai.com/api/docs/guides/latest-model)
says Astra follows longer instructions better but is sensitive to instructions
in skills and AGENTS files; unclear/conflicting guidance can cause early pauses.
It recommends auditing those files and calibrating delegation and testing.
It does not establish that length alone degrades Astra or that a 60–70% cut
improves performance. This cleanup is a local engineering judgment.

[Codex instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
loads applicable AGENTS files along the working-directory ancestry; ordinary
Markdown is not all automatically loaded. Savings therefore depend on reducing
both the entry policy and unnecessary reading chains.
[Subagent guidance](https://learn.chatgpt.com/docs/agent-configuration/subagents)
supports explicit model choice and Terra for lighter supporting work. Delegation
still adds context/review overhead; it is not automatically a token saving.

## Changes

- Root policy now distinguishes experimental SCC/Goldfishes from maintained
  C-VAL/ddong-meong, and records user-selected lead models plus bounded Terra
  delegation. No primary-model lock or global configuration change.
- Removed duplicate execution rules, routine mandatory reading chains,
  repetitive design checklists, and a reference to nonexistent CLAUDE.md.
  Scoped Next.js reading to relevant Next-specific code; component organization
  no longer demands incidental file moves during a small fix.
- Preserved HTTPS/browser restrictions, exact server-request wording, runtime
  pins, stable React IDs, socket isolation, UI invariants, and GPU safety.
  GPU safety explicitly wins over source-clone fidelity when they conflict.
- Corrected C-VAL's retired route map, historical WIP/idle-status ambiguity,
  stale shake CLI/coverage claims, and broken references to retired `1.md`.
- Condensed app records while retaining equations, parameters, citations,
  measured results, useful failures, and uncertainty. A second review restored
  omitted details in attractor, Cycle, adaptive-network, and Goldfishes records.
- Added [documentation writing guidance](documentation.md): single ownership,
  selective loading, current/history separation, and replacement of duplicate
  instructions instead of accumulation.

## Measurement and validation

Root AGENTS: 2,261 → 744 words (67% reduction). The nine edited existing shared
entry/policy files total 7,863 → 2,781 words (65% reduction), excluding newly
added writing guidance and this review. These are whitespace word counts, not
billed tokens. Markdown-only app totals:

| Docs | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| SCC | 59,331 | 29,071 | 51% |
| Goldfishes | 9,791 | 3,373 | 66% |
| C-VAL + ddong-meong | 41,297 | 39,322 | 5% |

Research and source ledgers are intentionally retained rather than cut to a
quota. Counts use `wc -w` on Markdown paths; CSV and other files are excluded.

Validation is static: document links, diff whitespace, retained constraints,
and selected code/registry/CLI cross-checks. No application code changes,
builds, servers, or browser checks. No comparative model-performance evaluation
was run. Some app documents already lacked a Git baseline; this task did not
stage or commit files.
