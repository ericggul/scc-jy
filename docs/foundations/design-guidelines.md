# SCC Common Visual Design Guidelines

This document applies repository-wide. Read it before creating a new interface or materially redesigning an existing one.

## Core principle: a wrapper is not a costume

A visual wrapper is the perceptual and interactive form through which a participant encounters parameters, state, and relations. It is not a themed illustration of a subject.

If a node is called “Central Bank,” “Treasury,” “AI,” “Quantum,” “News,” or “Social Media,” those names do not by themselves authorize a terminal, dashboard, control room, neon grid, institutional seal, feed, or other stereotyped surface. First determine:

- Who is looking or acting?
- Which parameter can they observe or change?
- Which relation must become perceptible?
- What expectation should the interface let them form?
- Why does this visual form make that task clearer than a neutral wrapper?

Without answers, styling the subject is decoration rather than interface design.

## Prohibited default: the AI concept dashboard

Never respond to an abstract system, institution, agent, process, or dataset by automatically producing a collection of faux dashboards.

The recognizable formula includes:

- near-black backgrounds with one neon cyan, green, orange, or red accent;
- glow, gradients, luminous grid lines, glass panels, or radar-like decoration;
- one enormous number surrounded by tiny uppercase labels;
- obligatory sparklines, gauges, progress bars, heat cells, or status dots;
- dense borders and cards whose subdivisions do not encode real structure;
- fake `LIVE` states, revision numbers, timestamps, system codes, mode badges, or connection indicators;
- ornamental arrows, pipelines, footer chains, or process captions;
- different color themes and visual identities assigned to nodes solely because their names differ;
- technical-sounding copy that simulates specificity without helping a participant understand or act.

These elements are not universally forbidden in every context. They are forbidden as an automatic formula or as a substitute for a grounded interface concept. An element may appear only when the interaction, domain convention, or information structure actually requires it.

## The surface-level failure

The formula is aesthetically weak because it is overdetermined and generic at the same time.

- Every element asks for attention, so no hierarchy remains.
- Excessive borders, accents, and micro-components destroy whitespace and pacing.
- “Technical” decoration makes unrelated projects look interchangeable.
- A collection of separately themed screens reads as a mood board rather than one system.
- The design announces an atmosphere before it communicates a parameter.
- It looks specific only because it is visually busy; remove the labels and it could represent finance, climate, logistics, AI, healthcare, or a spaceship without changing.

This is not minimalism. Reducing the color palette while keeping badges, grids, charts, codes, and ornamental hierarchy is still maximal decoration.

## The deeper conceptual failure

The more serious error is not the palette. It is a misunderstanding of what an interface is.

### 1. It confuses representation with operation

A dashboard-looking image represents “a complex system.” An interface should let a participant perceive or operate a particular relation inside that system. Looking technical is not the same as making a system legible.

### 2. It confuses the subject with the user situation

“Central bank” is an institution, not a user, task, or interface requirement. Designing from the noun produces costume. Designing from the observation or action produces an interface.

### 3. It confuses density with rigor

More metrics, panels, and labels do not make a model more precise. When the underlying experiment is intentionally bounded, simulated precision actively misrepresents it.

### 4. It confuses difference with differentiation

Giving every node a different theme makes them visually distinct but may destroy their shared system grammar. Meaningful differentiation must come from different parameters, controls, temporal behavior, or observation roles.

### 5. It confuses a Parametric Interface with a dashboard

A Parametric Interface is defined by the coupling between parameters and a visual wrapper: `W(x1, x2, …)`. It is not defined by displaying many values. The design task is to expose, transform, or question that coupling—not to decorate variables with charts.

### 6. It treats the wrapper as the artwork’s subject

In relational and multi-device work, the important experience may exist across screens and edges. A spectacular autonomous wrapper can obscure that relation and reduce the work to several independent screen designs.

### 7. It copies a surface instead of an interface grammar

References such as financial terminals, calendars, feeds, maps, or control panels should be studied for their hierarchy, interaction grammar, parameter conventions, and user expectations. Copying their colors and visual density without those functions is pastiche.

## Required design procedure

Before implementation, state the following in the experiment document or working notes:

1. **Participant situation:** who encounters the interface and under what condition.
2. **Primary parameter:** the single most important value, state, or relation.
3. **Perceptual job:** what change the participant must be able to notice.
4. **Interaction job:** what action is possible and what expectation it should create.
5. **Wrapper justification:** why this form is appropriate beyond matching the subject’s visual stereotype.
6. **System family:** which visual and interaction rules must remain shared across related screens.
7. **Removal test:** which elements can be deleted without reducing parameter or interaction legibility.

Reject the proposal if its palette, badges, charts, and labels could be transferred unchanged to a different subject by replacing nouns.

## Minimal wrapper baseline

When a distinct interface concept has not yet been earned, use a minimal wrapper:

- one neutral surface;
- one clear typographic hierarchy;
- one primary parameter;
- only necessary secondary parameters;
- thin functional rules rather than cards and chrome;
- no decorative status, captions, badges, footers, or fake metadata;
- a single restrained visualization only when temporal or relational change requires it;
- a coherent family across screens;
- whitespace as active structure.

Minimal is the baseline for inquiry, not a claim that every final work must remain visually neutral. Expressive design may be added later, but every addition must be justified by perception, interaction, domain convention, or conceptual operation.

## Reference use

Do not imitate a reference’s outward style. Extract the rule that makes it work.

For example, `stock/2` is not permission to use terminal styling everywhere. Its relevant lessons are compact information hierarchy, stable tabular alignment, semantic color, domain-specific command grammar, and a clear relationship between functions. If those functions are absent, its surface is irrelevant.

Likewise, détournement requires a recognizable original coupling between wrapper and parameter. Randomly placing unfamiliar data into a familiar-looking shell is not automatically détournement; the original convention and the transformed relation must both remain legible.

## Multi-device rule

For a multi-device work, evaluate the whole system before polishing individual screens.

- The relation between screens must remain more important than autonomous screen spectacle.
- Screens should share enough visual grammar to be perceived as one system.
- Differences must reveal different parameter roles or observations.
- A wrapper must not become so self-sufficient that the work no longer needs multiple devices.
- The controller and screens should make edges, propagation, state transition, or mutual influence perceptible without explanatory decoration.

## Rejection checklist

Stop and simplify if any answer is “yes”:

- Would this still look plausible if every subject noun were replaced?
- Did the design begin with a color theme rather than a participant task?
- Are there labels or indicators that describe fiction rather than usable state?
- Does every screen have a separate visual theme without a parameter-level reason?
- Are charts present because data “should have charts” rather than because change must be perceived?
- Is visual complexity compensating for an unclear interaction?
- Is the wrapper more memorable than the relation the experiment is meant to expose?
- Is the interface pretending the model is more accurate, live, or operational than it is?

If so, return to the minimal wrapper baseline and re-establish the parameter, relation, and user situation before styling again.
