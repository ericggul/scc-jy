# C-VAL 2 full-orientation interaction options

Status: Options B and C were tried and rejected on 2026-08-04. Option C's persistent pose
intensity pinned real-phone output near `V=89`, `L=11`, and later held the whole
triple near `69/32/31` despite continued sensor packets. The active bounded
motion-led Option B traversed V/A/L during idealized broad rotation but produced
too little price variation for ordinary small handheld movement. No option in
this document was selected. The later direct rotation-rate WIP is recorded in
[`2-iteration-ledger-2026-08-05.md`](./2-iteration-ledger-2026-08-05.md); this
file remains a failure record, not an approved implementation plan.

The governing correction is non-negotiable: full-direction response and strong,
fun response to normal small phone movement have equal priority. Do not solve
one as a main case and the other with exceptions. Do not add small-angle modes,
large-turn modes, inversion branches, axis fallbacks, or further quaternion
machinery merely to enumerate cases. One simple fixed mapping must cover the
whole human movement space.

## Participant, not parameter operator

The participant is not expected to target V, A or L. They hold a phone like a
small conducting object, try turns and reversals, watch the surrounding market
and social screens, and gradually discover relations such as:

- “turning it this way makes the market rise”;
- “reversing that movement makes it fall”;
- “moving violently makes the market unstable”;
- “holding or calming it lets the market settle.”

V/A/L remain intermediate market conditions. They must not become three hidden
sliders that require precise sensor literacy.

## Human actions the input model must survive

A real participant may begin in any comfortable pose and then:

- tilt slowly forward, backward, left or right;
- twist around the axis perpendicular to the screen;
- turn the phone through portrait, landscape and upside-down poses;
- flip the screen from facing the participant to facing away;
- rotate 180 degrees, continue through a complete 360-degree path, or make
  repeated turns;
- make a short flick, broad sweep, irregular shake, pause or reversal;
- combine axes rather than isolating a laboratory-perfect pitch, roll or yaw;
- change grip, lower the arm, cross an Euler-angle boundary, temporarily lose
  sensor samples or trigger a browser screen-orientation change.

The same physical action should retain the same relation after passing through
an upside-down pose. A coordinate discontinuity must not be mistaken for a
human reversal.

## Why three Euler values cannot be mapped independently

`DeviceOrientationEvent` reports intrinsic Z-X'-Y'' Tait-Bryan angles. Alpha is
in `[0, 360)`, beta in `[-180, 180)`, and gamma in `[-90, 90)`. The axes are
applied sequentially, so they are not three independent sliders. Near special
poses the same smooth physical turn can redistribute sharply between reported
angles. Screen orientation also does not redefine the device coordinate frame.

A complete 360-degree turn ends at the same physical orientation at which it
started. No function of current orientation alone can distinguish “never
moved” from “completed one full turn.” Detecting that human action requires a
time series of relative rotations or angular velocity.

Reference: W3C Device Orientation and Motion, current Candidate Recommendation
Draft: https://www.w3.org/TR/orientation-event/

## Rejected representation-first premise

The following list was previously presented as a required foundation. That was
premature and encouraged implementation complexity before the human interaction
was solved:

1. Convert each alpha/beta/gamma sample, in the specified Z-X'-Y'' order, to a
   rotation matrix or unit quaternion.
2. Compensate for browser screen orientation explicitly.
3. Store the first comfortable pose as a neutral frame `q0`.
4. Compute current relative pose `qPose = inverse(q0) * qCurrent`.
5. Compute temporal rotation `qStep = inverse(qPrevious) * qCurrent` on every
   sample.
6. Extract from `qStep` a continuous angular-velocity vector and accumulated
   rotation path. Use shortest-arc quaternion continuity so an Euler wrap does
   not create a false jump.
7. Keep pose, motion and confidence separate. Missing or implausible samples
   reduce confidence; they do not silently become zero-degree human intent.

That paragraph was the justification used for the representation-first trial.
It is no longer accepted as a prerequisite: any future representation must earn
its place by producing the complete human experience with less—not more—visible
or behavioral complexity.

## Option A — pose-led spherical conductor

The relative phone frame supplies two meaningful vectors: the outward screen
normal and the top edge of the phone. Their position on the unit sphere, rather
than alpha/beta/gamma separately, determines the persistent market tendency.
Motion speed changes strength.

Participant experience:

- a held pose maintains a legible tendency;
- turning through any axis continuously changes that tendency;
- flipping the phone is represented correctly;
- a full turn sweeps through intermediate states and returns to its start.

Strength:

- best match for learning that a particular angle or pointing direction tends
  to rise, fall or settle;
- no Euler seams and no ±35-degree dead plateau.

Cost:

- any continuous scalar field over all orientations necessarily has neutral
  contours and extrema;
- a completed 360-degree turn has no lasting evidence after it ends unless the
  temporal path is also used.

## Option B — motion-led conducting baton (active bounded trial)

Current pose only establishes the coordinate frame. The market reads the
signed angular-velocity vector across all three physical rotation axes.
Reversing a turn reverses market direction; angular speed supplies intensity;
stopping removes the directional push.

Participant experience:

- every pitch, roll, twist, flip and 360-degree turn acts while it is happening;
- reversal is immediately legible;
- no fixed angle can trap the values at an endpoint.

Strength:

- strongest coverage of unrestricted human motion and repeated 360-degree
  paths;
- naturally distinguishes movement from stillness.

Cost:

- the same held angle does not maintain the same result;
- a single signed scalar derived from a 3D angular vector needs a declared
  directional convention. Simultaneous opposing components may cancel.

Active convention: convert each quaternion step to angular velocity in the
initial phone frame, then use its largest signed component. V follows speed, A
follows that signed component, and L follows cosine coherence with the previous
velocity. A held pose contributes nothing. No learned axis, dwell, window, or
second input channel is added.

## Option C — hybrid pose plus motion (rejected real-phone trial)

Failure: absolute pose distance was included in intensity. After a large turn
or inversion that distance remained large even while subsequent motion changed,
so V stayed high and the inversely coupled L stayed low. Smoothing preserved
the lock. This reproduced the exact endpoint-sticking problem the trial was
supposed to remove. Do not reintroduce persistent pose magnitude into live V or
L.

Use full 3D pose to establish a slowly changing market tendency and full 3D
motion to create immediate impulses around it.

```text
poseDirection   = continuous score from screen-normal and top-edge vectors
motionDirection = signed score from the temporal rotation vector
motionEnergy    = magnitude of angular velocity plus bounded linear acceleration

direction = soft-compress(poseDirection + motionDirection)
intensity = soft-compress(motionEnergy)
stability = inverse of recent motion irregularity
```

Then derive V/A/L as intermediate conditions rather than direct axes:

```text
V <- intensity and irregularity
A <- signed direction and motion energy
L <- calmness / stability, reduced by violent motion
```

Participant experience:

- a recognizable pose can sustain a rise/fall expectation;
- a fast turn, flip or complete rotation produces an immediate visible market
  impulse;
- stopping or deliberately balancing the phone can produce a quiet state;
- alpha, beta and gamma are all represented through one physical rotation, not
  exposed as unrelated controls.

The first trial should change only the sensor-to-intermediate mapping. The
existing socket room, aggregation, market engine, execution-derived price and
screen presentation remain invariant.

Implementation location:

- `socket/experiments/c-val/2/orientation.mjs`: quaternion, pose, path and
  V/A/L mapping;
- `components/c-val/2/mobile/index.tsx`: sensor sampling and transmission;
- `socket/experiments/c-val/2/model.mjs`: unchanged market path consuming the
  mapped V/A/L conditions.

## Preventing long 0/100 plateaus

The current plateau is caused by hard-clamping beta at ±35 degrees. A normal
turn easily remains beyond that boundary while the phone continues moving.

The next trial should combine these measures:

1. Remove per-axis hard angle clamps from the perceptual mapping. Bound only
   invalid sensor input and final numerical safety.
2. Use quaternion/vector geometry so continuing beyond 35, 90 or 180 degrees
   continues to change the state.
3. Use a smooth compression such as `x / sqrt(x*x + scale*scale)` or `tanh`
   instead of a finite-angle clip. Exact endpoints then represent limits, not
   broad physical regions.
4. Calibrate `scale` from recorded human motion distributions, using fixed
   global percentiles rather than invisible per-person learning during the
   artwork.
5. Preserve temporal rotation so continued motion at an extreme pose still
   produces changing input.
6. Inspect unrounded values during validation. Integer display rounding can
   visually turn 99.5 into a false sustained 100 even without a mathematical
   clamp.

Merely changing `35` to a larger number is not a complete solution. It delays
the same saturation and still ignores inversion, twist and 360-degree paths.

## Baseline preservation before implementation

The current working behavior is recorded in
`docs/experiments/c-val/2-working-baseline-2026-08-04.md`, including formulas,
source identities and known limitations. Before changing runtime code, use one
of these preservation levels:

### Preferred: scoped Git baseline commit

The working beta baseline is already present at Git commit `07a5aaf` (`Fix:
C-Val 2`). Restore only the affected C-VAL 2 sensor files from that commit; do
not reset or restore the whole repository because unrelated work shares the
same history.

Advantages: exact restoration, inspectable diff, no copied live modules, and no
confusion over which implementation executes.

### Additional: inert source archive inside C-VAL 2

Copy the exact relevant sources into a dated `baseline/` directory using inert
extensions such as `.source.txt`, plus a manifest of hashes. Do not import or
execute those files.

Advantages: visible beside the experiment even without Git history. Cost:
duplicated source and a risk that later agents mistake it for live code.

### Strongest experimental preservation: new stable route

Keep the present `/c-val/2` behavior at a stable archived route and perform the
full-orientation trial as the next numbered experiment. This is appropriate if
both experiences must remain runnable for direct comparison. It is heavier
than a scoped commit and should be chosen deliberately rather than created by
default.

Do not use a repository-wide stash or commit all current changes: other agents
and the user own unrelated work in the dirty worktree.

## Evaluation before replacing the baseline

The next trial is acceptable only if human tests show all of the following:

- slow forward/back, left/right and twist movements all change the system;
- upside-down and 180-degree passages remain continuous;
- a complete 360-degree path is visible while it occurs;
- reversal reverses or materially changes the market response without a long
  unexplained delay;
- stillness produces a learnable quiet or sustained-pose behavior;
- ordinary motion spends most time in informative interior ranges rather than
  rounded 0/100 plateaus;
- the same gesture relation survives different starting grips;
- displayed price remains execution-derived and the existing market engine is
  unchanged.

If the trial fails these criteria, restore the scoped baseline commit rather
than reconstructing the old logic by memory.
