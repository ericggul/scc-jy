# Tinkering as the SCC working method

This document states the repository-wide artistic and engineering method. It is
a working translation of Nassim Nicholas Taleb's account of convex tinkering
through the practices of Nam June Paik and Robert Rauschenberg. It does not claim
that these figures proposed this software architecture, nor does it reduce their
work to a development methodology.

## The governing position

SCC does not begin by pretending that the final artwork can be fully specified.
It learns through encounters with working material. A browser behavior, a
camera, a swarm rule, a texture, a screen relation, a dataset, or a failure can
reveal the next question more reliably than a long speculative plan.

Taleb's relevant distinction is not generic randomness or careless trial and
error. Tinkering must have a favorable asymmetry: repeated trials have bounded
cost while an unexpected result can disclose a much larger possibility. His
account of convexity and scientific discovery treats optionality as prior to a
complete explanatory theory. In SCC this becomes a practical rule: make a small
working intervention, keep what is learned, and avoid one irreversible change
that can ruin the archive or conceal which intervention mattered.

Paik offers a precedent for treating a technology as mutable artistic material.
His altered televisions, video synthesizer work with Shuya Abe, gathered
equipment, feedback, signal mixing, and live collaboration did not merely use a
finished delivery channel; they changed what the instrument could do and made
that change perceptible. Rauschenberg offers a related precedent through hybrid
works, ordinary materials, performance, and sustained collaboration across art,
engineering, dance, and technology. The useful inheritance is permission to
alter, combine, test, and learn with others—not permission to imitate CRT noise,
Combines, or any historical surface style.

Together these precedents support the SCC position:

```text
preserved working state
  -> bounded material intervention
  -> direct encounter with the result
  -> keep, fork, revise, or stop
  -> preserved evidence for the next trial
```

The explanation may become clearer after making. That does not mean the making
is arbitrary. Every experiment still needs a precise variable, observable
consequence, and protected baseline.

## What counts as an experiment

An SCC experiment is a runnable, addressable proposition. It changes one
coherent relation—or a tightly coupled set that cannot be perceived separately—
while preserving enough of a prior experiment to make the consequence legible.

An experiment is not:

- a decorative reskin whose changed elements have no perceptual or interactive
  job;
- an accumulation of unrelated features called exploration;
- an incomplete component excused by the word prototype;
- a shared abstraction that lets later edits silently rewrite prior trials;
- a retrospective story that removes failures and makes the path look planned.

Code duplication can therefore be intentional evidence preservation. Within an
experiment family that requires standalone trials, copying a complete working
experiment protects optionality: the fork can be changed or discarded without
damaging its parent, and the historical route continues to mean the same thing.
Do not "clean up" this duplication into cross-experiment imports when that would
couple their futures.

## Convexity translated into repository practice

### Bound the downside

- Start from the closest complete experiment rather than an empty reconstruction.
- Fork before changing a preserved result.
- Keep a trial local to its experiment directory.
- Avoid migrations, new dependencies, shared abstractions, and broad renames
  unless the question genuinely requires them.
- Never make archive-wide visual or behavioral changes as incidental cleanup.

### Keep the upside open

- Prefer a working spatial, temporal, behavioral, or material variation that can
  surprise its maker over a mockup that only confirms the prompt.
- Let the changed material expose secondary questions, but record those questions
  instead of silently expanding the current task.
- Preserve strange, failed, or unresolved results when they carry information.
  A rejected result can prevent repetition or become a later branch.

### Learn from contact, not narrative

- State the tested variable and the invariants before editing.
- Distinguish what was directly observed or measured from what is inferred.
- Do not invent performance guarantees, conceptual success, or artistic intent.
- When a result is weak, say what failed perceptually or operationally. Do not
  rescue it with explanatory interface copy.

### Stop before the trial becomes a programme

Finish the smallest complete experiment that answers the present question.
Further possibilities belong in notes or later forks. A rapid experiment loses
its epistemic value when many variables change and nobody can tell what produced
the result.

## Artistic and visual quality

Rapid does not mean visually generic. The result should feel deliberately made
at the level where the experiment operates: geometry, motion, timing, material,
composition, interaction, and relation between screens. It need not accumulate
interface chrome or decorative detail.

- Derive form from the participant's perceptual and interaction task.
- Make the tested relation visible without captions doing the artwork's job.
- Use technology structurally. A 3D library is not evidence of spatial depth;
  a socket is not evidence of meaningful connection; a dataset is not evidence
  of an operational system.
- Preserve the established visual grammar unless changing it is the experiment.
- Remove scenery, labels, effects, and controls that do not sharpen the trial.
- Treat authoring controls as tools, not automatically as participant-facing UI.
- Judge a variation against its baseline and from the actual relevant views or
  states, not from the novelty of its implementation.

The repository's detailed visual rules remain in
[`design-guidelines.md`](./design-guidelines.md).

## Archive as studio memory

The archive is not a showroom containing only winners. It is the studio memory
that makes cumulative tinkering possible. Every retained experiment should make
the following recoverable:

1. the route and date;
2. the short, concrete phrase naming the tested relation;
3. the baseline that was forked;
4. the variable that changed;
5. the visual and behavioral invariants that remained;
6. the observed outcome, including failures and uncertainty;
7. the next unresolved question, if one emerged.

Promoting an experiment to `default` does not erase its dated origin. Promotion
copies or deliberately replaces the baseline while the dated version remains an
addressable record.

## Parallel work is normal

Many SCC tasks may run concurrently. Parallelism is another source of
optionality only when agents do not collapse one another's branches.

- Inspect `git status` and the target directories before beginning.
- Treat every modified or untracked file as potentially active work.
- Work inside the assigned experiment boundary whenever possible.
- Re-read registries, indexes, and shared documentation immediately before
  editing them; patch only the necessary lines.
- Do not run repository-wide formatting or opportunistic refactors during a
  scoped experiment.
- Do not delete, revert, relocate, register, document as complete, or otherwise
  take ownership of newly appeared work unless the task explicitly includes it.
- If another change overlaps the exact lines required, preserve both when the
  intended composition is clear. If ownership or intent is ambiguous, stop and
  ask rather than choosing a winner.
- Before reporting completion, inspect the diff again and separate your changes
  from concurrent changes.

## References

- Nassim Nicholas Taleb, [*Convexity and
  Science*](https://fooledbyrandomness.com/ConvexityScience.pdf).
- Smithsonian American Art Museum, [Nam June Paik Archive
  highlights](https://americanart.si.edu/research/paik/highlights).
- Smithsonian American Art Museum, [*9/23/69: Experiment with David
  Atwood*](https://americanart.si.edu/artwork/92369-experiment-david-atwood-79097).
- Robert Rauschenberg Foundation, [*The Black Mountain Years: Experiments and
  Collaborations*](https://www.rauschenbergfoundation.org/art/lightboxes/black-mountain-years-experiments-and-collaborations).
- Robert Rauschenberg Foundation, [*Art and Technology,
  1959–98*](https://www.rauschenbergfoundation.org/artist/art-and-technology-1959-98).
