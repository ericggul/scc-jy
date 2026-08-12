# C-VAL 2 post-checkpoint iteration ledger

> Scope: the pre-checkpoint context plus every C-VAL 2 phone-to-V/A/L trial
> made after Git checkpoint `07a5aaf`. This is an honest working record, not a
> success narrative.
> The current iteration is **WIP and requires real-phone verification**.

## Resume here after a break

As of 2026-08-05, Git `HEAD` is still the recovery checkpoint `07a5aaf`; the
post-checkpoint C-VAL 2 work described here is in the working tree and is not a
new commit. Do not assume checkout of `HEAD` contains the current WIP, and do
not reset the repository to recover one C-VAL file.

The live experiment remains one system at `/c-val/2/*`. There is no C-VAL 3,
no comparison route, and no comparison socket. The mobile alone contains a
temporary authoring selector for three phone-to-V/A/L functions. Controller,
screens, C-VAL 2 room, aggregation, agents, order book, market equations and
execution-derived price are shared and unchanged across the selection.

The next agent should read, in order:

1. [`README.md`](./README.md) for family boundaries and verification rules;
2. this ledger for chronological decisions and rejected trials;
3. [`2.md`](./2.md) for the current behavioral and code contract;
4. [`2-working-baseline-2026-08-04.md`](./2-working-baseline-2026-08-04.md)
   only when an exact `07a5aaf` recovery is being considered;
5. [`2-interaction-failure-review.md`](./2-interaction-failure-review.md) and
   [`2-full-orientation-options.md`](./2-full-orientation-options.md) before
   proposing another mapping.

Resume validation with one active test phone so two phones cannot submit
different selected mappings into the arithmetic mean. For each button, select
it, confirm the same C-VAL 2 market returns to `100`/`waiting`, press
`ENABLE MOTION`, then repeat comparable ordinary wrist movements, reversals,
twists and broad turns. Record observed human experience here before changing
an equation. Static tests are not acceptance.

## Complete chronology map

This index includes implemented trials and rejected proposals so a future agent
does not mistake an unimplemented suggestion for a former working version.

| Order | State | Implemented? | Result | Full record |
| ---: | --- | --- | --- | --- |
| 0 | C-VAL 1 independent alpha→V, beta→A, gamma→L | yes | expressive baseline, but bodily price causality was hard to learn | [`1.md`](./1.md) and the exact comparison spec below |
| 1 | learned classifier: RMS, cadence, dwell, learned axis, pressure and privileged operator | yes | rejected; weak, latent and irreproducible | [`2-interaction-failure-review.md`](./2-interaction-failure-review.md) |
| 2 | tap one of V/A/L, then use one tilt to set it | proposal and partial interface work | rejected; made intermediate parameters the participant's GUI task | [`2-interaction-failure-review.md`](./2-interaction-failure-review.md) |
| 3 | weak multi-axis angle sum and small market direction | yes | rejected; preserved V1 ambiguity with less dramatic price | Iteration 1 below and the failure review |
| 4 | fixed calibrated beta coupling at `07a5aaf` | yes; Git checkpoint | worked strongly, but only one axis and hard endpoint plateaus | checkpoint section and [`2-working-baseline-2026-08-04.md`](./2-working-baseline-2026-08-04.md) |
| 5 | persistent-pose quaternion hybrid | yes | rejected; V high/L low lock after flips | Iteration 2 below |
| 6 | quaternion motion-path velocity/coherence | yes | rejected; ordinary handheld motion too weak | Iteration 3 below |
| 7 | special small-angle plus inversion/quaternion branches | proposal only | rejected before implementation; violated one-rule simplicity | rejected strategy section below |
| 8 | direct three-axis rotation-rate equation | yes; current WIP | promising but not human-accepted | Iteration 4 below |
| 9 | separate C-VAL 3 and compare routes/sockets | partial implementation | rejected and removed as overengineering | rejected comparison architecture below |
| 10 | three mapper buttons inside the existing C-VAL 2 mobile | yes; current WIP instrument | awaiting controlled real-phone comparison | Iteration 5 and exact specs below |

## Fixed objective and invariants

The participant conducts one market by moving one phone. The intended learned
relation is bodily and immediate:

```text
move or shake the phone this way     -> executed price rises
reverse the movement                 -> executed price falls
reduce or balance the movement       -> directional drive diminishes
```

V/A/L are intermediate market conditions, not values the participant selects
or learns to control precisely. Two requirements have equal priority:

1. ordinary small handheld movements must already produce large, enjoyable
   market consequences;
2. pitch, roll, twist, inversion, 180/360-degree turns and mixtures must all
   remain responsive under the same rule.

The permanent participant interaction must not add GUI input, learned axes,
hidden modes, pressure, dwell, rhythm, gesture classes, privileged orders,
direct price assignment, or
case-by-case rules. The current three-button authoring selector is an explicitly
temporary comparison instrument; it selects a whole mapping before permission
and never assigns V/A/L. The existing socket aggregation, agents, FIFO order
book, execution-derived price, controller, screens and C-VAL 1 are invariants.

## Checkpoint: `07a5aaf`

### Algorithm

The calibrated beta angle alone controlled all three values:

```text
d = clamp(beta / 35, -1, 1)
V = 0.5 + 0.5 * abs(d)
A = 0.5 + 0.5 * d
L = 0.5 - 0.5 * abs(d)
```

### What worked

- It was simple, immediate and strong.
- Opposite beta directions produced opposite market tendency.
- The existing socket and execution-derived market path worked robustly.

### Why it was not sufficient

- Only beta mattered; pitch/roll/twist mixtures and complete rotations did not
  share the experience.
- Beyond ±35 degrees the values stayed exactly at 0/100, so more human motion
  stopped producing more intermediate change.
- The intended bodily relation was therefore narrow and endpoint-heavy.

This checkpoint remains the scoped recovery point. Recovery means restoring
only the C-VAL 2 trial files from `07a5aaf`, never resetting unrelated work.
## Iteration 1: multi-axis angle combinations

### Attempt

Alpha, beta and gamma angle values were combined into V/A/L, with additional
engagement, pressure or activity conditions intended to stabilize the result.

### Observed failure

- Long runs stayed at 50/50/50 and price 100 while the mobile was not accepted
  as engaged.
- When signals arrived, price movement was much weaker and less legible than
  the checkpoint.
- More conditions made the same phone gesture produce different outcomes.

### User feedback

The experience was less dynamic than C-VAL 1 and still did not teach a stable
“this direction rises / the opposite direction falls” relation. Hidden
conditions, GUI selection and precision control of V/A/L were explicitly
rejected.

### Root mistake

The implementation optimized internal parameter interpretation instead of the
participant's visible action-to-price causality.

## Iteration 2: persistent-pose quaternion hybrid

### Attempt

Device orientation was converted to quaternions. Absolute distance from an
initial pose and instantaneous motion were combined to support wraps,
inversion and complete rotations.

### Observed failure

After a flip or large turn, absolute pose distance remained large even when the
participant changed movement. V stayed near 89–94, L near 6–11, and the market
entered an extreme low-liquidity regime. Current movement no longer had clear
control over the displayed state.

### User feedback

The phone was being turned vigorously but V and L appeared frozen near the same
extreme values. Price then exploded or collapsed for reasons disconnected from
the current conducting gesture.

### Root mistake

A persistent pose was allowed to dominate a temporal human action. Formal
orientation coverage was achieved at the cost of responsiveness and agency.

## Iteration 3: motion-path quaternion overcorrection

### Attempt

Persistent pose was removed. Quaternion step velocity in the initial phone
frame drove speed-based V, dominant signed-direction A and path-coherence L.
The characteristic speeds were approximately 4–5 rad/s
(229–286 degrees/second).

### Observed failure

- Broad, idealized full rotations could traverse the range.
- Ordinary phone holders making small wrist movements produced weak V/A/L and
  uninteresting price movement.
- Coherence made L an artificial memory of continuation/reversal rather than a
  direct readable consequence of current motion.
- Synthetic path tests overrepresented ideal large rotations and therefore did
  not predict the real-phone experience.

### User feedback

The user emphasized that most people do not rotate a phone through a perfect
360 degrees. The practical result was simply that price variation was too small
and not fun.

### Root mistake

The response scale was calibrated to technically large angular velocities, not
ordinary embodied use. Additional quaternion state solved representation
problems while obscuring the interaction.

## Rejected strategy proposal: special small-angle and inversion handling

A follow-up proposal prioritized 5–20-degree movement and retained quaternion
or inversion-specific handling for wider rotations. It was rejected before
implementation.

### User feedback and reason for rejection

Small ordinary motion and all-direction response are equal priorities, not a
main case plus exceptions. Adding separate branches for small angles, inversion
and large turns violates the required simplicity and would create more hidden
behavior.

## Iteration 4: direct three-axis rotation-rate mapping — current WIP

### Changed variable

Only the phone-to-V/A/L relation changes. The browser's current
`DeviceMotionEvent.rotationRate` is used directly in degrees/second:

```text
energy = |alpha| + |beta| + |gamma|
signed = alpha + beta + gamma

intensity = energy / (12 + energy)
direction = signed / (12 + |signed|)

V = 0.50 + 0.48 * intensity
A = 0.50 + 0.48 * direction
L = 0.50 - 0.48 * intensity
```

The same equation applies to every axis and every magnitude. There is no
baseline pose, quaternion, temporal window, dominant-axis selector, inversion
branch, learned state or mode. A 1 degree/second threshold only separates sensor
noise from the existing engaged/dormant lifecycle; it does not change the
mapping equation.

### Intended experience

- Ordinary 10 degrees/second movement already maps near V 72 / A 72 / L 28.
- Ordinary 20 degrees/second movement maps near V 80 / A 80 / L 20.
- Reversing the same movement keeps V/L strength and reverses A.
- Opposing simultaneous axes may cancel signed direction, but their motion
  energy remains visible through high V and low L.
- Large turns approach but never reach exact 0 or 100, avoiding endpoint lock.

### Retained invariants

- One physical input only; no mobile control UI was added.
- Existing V/A/L-to-agent behavior, FIFO matching and execution-derived price
  are unchanged.
- Existing socket room, aggregation and version isolation are unchanged.
- Controller and screen presentation are unchanged.
- C-VAL 1 is unchanged.

### Current verification status

This iteration is **WIP, not accepted**. Static tests establish only that:

- rest is neutral and ordinary 10–20 degrees/second motion is already strong;
- alpha, beta and gamma use the same response;
- reversing any one axis reverses A while preserving V/L intensity;
- mixed opposing axes retain turbulence;
- values remain strictly inside 0–1;
- opposite ordinary rotations drive opposite execution-derived price direction
  across deterministic market seeds.

The existing synthetic orientation shake suite remains a market-integrity
regression only. It is not evidence for this live rotation-rate interaction.
Real-phone verification must still judge:

1. whether normal small movements feel immediately powerful and enjoyable;
2. whether all axes and combinations remain perceptibly responsive;
3. whether reversal is learnable rather than merely numerically symmetric;
4. whether real sensor noise causes unwanted activation;
5. whether the executed price response is dramatic without becoming detached
   from the participant's current movement.

If this fails, record the observation here before any next bounded trial. Do
not add exception branches. Restore the scoped C-VAL 2 files from `07a5aaf`
only if the user explicitly requests the checkpoint.

## Iteration 5: lean within-C-VAL 2 mapping comparison — WIP

This is temporary validation instrumentation, not a third experiment and not a
new market system. The existing `/c-val/2/mobile`, controller, screens, socket
room, agents, order book and V/A/L-to-price behavior remain one system. Only the
phone-to-V/A/L function selected by the mobile changes:

1. `C-VAL 1`: the exact calibrated alpha→V, beta→A, gamma→L equations;
2. `07A5AAF`: the exact calibrated beta-only checkpoint equation;
3. `CURRENT`: the unchanged direct three-axis rotation-rate WIP equation.

Each selection stops the current sensor listener, clears local calibration,
resets the same C-VAL 2 market to 100, and returns to `ENABLE MOTION`. This makes
the comparison begin from the same market state and requires a fresh deliberate
sensor activation. The selector does not directly assign V/A/L.

Status: **WIP, requires real-phone comparison.** The three mapping equations
have static identity tests. Human responsiveness, learnability and fun remain
empirical acceptance questions.

## Exact specifications of the three currently selectable mappings

These are three input mappers inside C-VAL 2, not three complete versions of
the market. Their button labels and IDs are fixed in the mobile as follows:

| Button | Internal ID | Browser event | Local baseline | Engagement |
| --- | --- | --- | --- | --- |
| `C-VAL 1` | `c-val-1` | `deviceorientation` | first sample after enable | maximum absolute calibrated axis ≥ 2° |
| `07A5AAF` | `07a5aaf` | `deviceorientation` | first sample after enable | absolute calibrated beta ≥ 2° |
| `CURRENT` | `current` | `devicemotion.rotationRate` | none | total absolute rotation rate ≥ 1°/s |

All modes send no more frequently than once per 16 ms. Non-finite sensor values
become zero. Selecting any button—even the already selected one—removes both
possible sensor listeners, clears the baseline and latest raw sample, restores
the local preview to 50/50/50, emits the existing C-VAL 2 reset, and returns the
permission state to `ENABLE MOTION`.

### `C-VAL 1` mapping copy

This copies only C-VAL 1's phone mapping into the C-VAL 2 market. It does not
switch to the C-VAL 1 route, socket, controller or market runtime.

The first orientation sample is the baseline:

```text
alpha = wrapped(rawAlpha - baselineAlpha), in [-180, 180)
beta  = rawBeta  - baselineBeta
gamma = rawGamma - baselineGamma
```

The exact mapping is:

```text
V = clamp(0.5 + 0.5 * alpha / 90, 0, 1)
A = clamp(0.5 + 0.5 * beta  / 90, 0, 1)
L = clamp(0.5 + 0.5 * gamma / 45, 0, 1)
```

The three values are independent, linear inside their respective ranges and
hard-clamped at 0/1 outside them. This mode can therefore test the original
expressive multi-axis range while holding the C-VAL 2 downstream market fixed.

### `07A5AAF` checkpoint mapping copy

This uses the same calibrated orientation values, but only beta affects the
three intermediates:

```text
d = clamp(beta / 35, -1, 1)
i = abs(d)

V = 0.5 + 0.5 * i
A = 0.5 + 0.5 * d
L = 0.5 - 0.5 * i
```

At beta 0 it is 50/50/50. At beta +35° it is 100/100/0; at beta -35° it is
100/0/0. Alpha and gamma do not affect the output. This is the known strong,
simple and directionally legible checkpoint, with the known one-axis and
endpoint-plateau limitations.

### `CURRENT` direct rotation-rate WIP

There is no baseline or persistent pose. The browser's instantaneous alpha,
beta and gamma rotation rates are read in degrees/second:

```text
energy = |alpha| + |beta| + |gamma|
signed = alpha + beta + gamma

intensity = energy / (12 + energy)
direction = signed / (12 + |signed|)

V = 0.50 + 0.48 * intensity
A = 0.50 + 0.48 * direction
L = 0.50 - 0.48 * intensity
```

All axes use the same equation. Rest is 50/50/50. Reversal keeps V/L intensity
and reverses A. Opposing simultaneous axes retain high energy while their signed
direction may cancel. Outputs approach but never mathematically reach 0.02 or
0.98, and therefore never reach 0/1.

### Shared downstream specification for a controlled comparison

After a mapper emits V/A/L, every mode follows the identical path:

- joined mobile controls are accepted only while `engaged` and become stale
  after 450 ms;
- current phones are averaged equally, separately for V, A and L;
- server parameters approach the target at response rate 8 per second;
- the existing C-VAL 2 direction equation, agents, order submission,
  cancellation, FIFO matching and execution-derived displayed price remain
  unchanged;
- before the first engaged sample after reset, phase is `waiting`, price is
  exactly 100, and participants, orders, executions and depth are empty;
- no upper displayed-price cap is configured; the positive one-tick floor is
  0.01.

## Real-phone comparison notes — fill in after testing

Do not tune code while filling this section. First record comparable movements
and observations for all three modes.

### `C-VAL 1`

- Date / phone / browser:
- Ordinary small wrist movement:
- Pitch / roll / twist / inversion / broad turn:
- Rise/fall reversibility:
- Price magnitude and fun:
- Endpoint or inactive-axis behavior:
- Pros:
- Cons:
- Keep / reject / retest:

### `07A5AAF`

- Date / phone / browser:
- Ordinary small wrist movement:
- Pitch / roll / twist / inversion / broad turn:
- Rise/fall reversibility:
- Price magnitude and fun:
- Endpoint or inactive-axis behavior:
- Pros:
- Cons:
- Keep / reject / retest:

### `CURRENT`

- Date / phone / browser:
- Ordinary small wrist movement:
- Pitch / roll / twist / inversion / broad turn:
- Rise/fall reversibility:
- Price magnitude and fun:
- Rest/noise behavior:
- Pros:
- Cons:
- Keep / reject / retest:

### Comparative conclusion

- Best immediate causality:
- Best ordinary-handheld responsiveness:
- Best all-direction response:
- Best controllable rise/fall relation:
- Most enjoyable price consequence:
- Failure that must not be repeated:
- Next bounded change, if any:

## Rejected comparison architecture: C-VAL 3 and separate compare system

An implementation briefly copied the checkpoint into `components/c-val/3`,
added separate comparison components/routes and registered comparison socket
modules. This was rejected as overengineering: the task was to compare only the
phone-to-V/A/L relation inside the already existing C-VAL 2 experience, not to
create three complete products or duplicate its screens and market.

Those generated routes, components, socket modules and comparison document were
removed. Do not recreate `app/c-val/compare`, `components/c-val/3`,
`components/c-val/comparison`, `apps/c-val/socket/experiments/3`, or
`apps/c-val/socket/experiments/comparison` for this validation. The accepted lean
boundary is the three pure mapping functions plus the selector in
`components/c-val/2/mobile/index.tsx`.

## Infrastructure incidents and retained repairs

Several failures during iteration were infrastructural rather than evidence
about the human mapping:

- A mobile imported `orientationToCValParameters` after its export had been
  removed, causing a static module build error. Browser imports and the model
  public exports must be changed together; the current imports type-check.
- A malformed JSON read once prevented static path generation for the
  controller. Do not respond to a route-generation failure by changing sensor
  or market behavior; inspect the exact parsed artifact first. No separate
  comparison route or JSON configuration is part of the current design.
- During socket edits, both versions stopped receiving mobile input and C-VAL 2
  showed `OFFLINE`. The recovery principle is to retain each established
  version-owned join, role, room and event prefix and avoid a coordinator or
  relay layer. Current work does not change C-VAL 1 or the global experiment
  registry. The only deliberate C-VAL 2 socket authorization change is that a
  joined mobile may emit the existing reset event when the mapping selector is
  pressed.
- Sensor recording was incorrectly rejected whenever `NODE_ENV` was anything
  other than the literal `development`. It now rejects only production, so the
  local experimental environment can save traces. This recorder remains
  temporary and does not alter V/A/L.

Because the reset authorization and recorder guard live in the socket process,
an already-running server must be restarted before validating this working
tree. Runtime/browser validation has not been performed by the coding agent.
