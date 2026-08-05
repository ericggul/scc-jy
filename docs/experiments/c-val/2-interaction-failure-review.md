# C-VAL 2 interaction failure review

> Rejected trials on 2026-08-04: learned humane-input mapper; incorrect
> baseline restoration and GUI-selection proposal; weak multi-axis V/A/L sum;
> persistent-pose quaternion hybrid; motion-path quaternion overcorrection.
>
> This document exists to prevent another agent from rebuilding the same
> failure. It describes a rejected implementation, not the active C-VAL 2
> contract.

## State of today's work

The actual task is a single, GUI-free chain:

```text
directional phone movement -> V/A/L together -> market executions -> price
```

The participant learns repeatable bodily directions for rise, fall, and relative
stillness. They do not select V/A/L and do not learn to set precise V/A/L
numbers. V/A/L are intermediate conditions, not the interaction goal.

Five implementation mistakes occurred while trying to state that task
correctly in code:

1. **Classifier overdesign:** hidden learned axes, motion RMS, rhythm, dwell,
   pressure, and a privileged operator made the gesture unstable and price weak.
2. **False simplification:** after rejecting the classifier, the work restored
   the C-VAL 1 mapping without adding a learnable gesture-to-price relation, then
   proposed tapping one V/A/L mode and tilting to set a precise value. This was
   also outside the task because it turned intermediate values into GUI targets.
3. **Weak multi-axis sum:** independent alpha/beta/gamma again changed V/A/L,
   then `(V-.5)+(A-.5)` supplied a small directional bias. Runtime observation
   showed neither large rises/falls nor a learnable angle expectation. It kept
   V1's three-axis ambiguity while reducing V1's dramatic market range. Static
   seed tests proved only the chosen extremes, not a human-discoverable gesture.
4. **Persistent-pose quaternion hybrid:** full-orientation math removed Euler
   seams, but absolute distance from the initial pose fed a shared intensity.
   Real-phone output pinned near `V=89`, `L=11`, and later the whole triple held
   near `69/32/31` while fresh packets still arrived. It fixed coordinate
   representation but repeated the perceptual plateau.
5. **Motion-path quaternion overcorrection:** removing pose lock made V/A/L
   traverse their numerical range during idealized broad rotations, but normal
   small phone movements produced weak, brief market drive and little executed-
   price range. The response then incorrectly proposed prioritizing small-angle
   use over full-direction response and adding special small-angle, inversion,
   and quaternion handling. The user explicitly rejected both the priority
   split and the growing exception list.

None of the rejected states is an approved design, and none is the current live
mapping. The current WIP is the direct rotation-rate equation recorded in
[`2-iteration-ledger-2026-08-05.md`](./2-iteration-ledger-2026-08-05.md), with a
temporary within-C-VAL 2 author selector for comparing it against the two exact
earlier mappings.

## Intended experience

C-VAL is not a sensor-classification demonstration. A person holding a phone
is placed in the role of a market-moving power. Moving the phone must change
V/A/L immediately and visibly; those market conditions must alter orders,
executions, and price quickly enough that the same person can perceive authorship
of the disturbance. Surrounding screens show how that disturbance reaches
people outside the controller's position.

Full-direction response and strong ordinary-handheld response are coequal.
The work must not describe 180/360-degree use as an edge case, and it must not
describe common 5–20-degree wrist movement as a separate privileged mode. One
simple mapping must make both materially effective and must create dramatic,
fun price movement through the existing market path.

Before the first human interaction there must be no simulated market activity:
price is exactly `100`, there are no participants, orders, executions, or book
depth. The first real phone movement starts the market. After activation the
market may continue running, but current phone input must remain plainly
legible.

## What the rejected trial changed

The preserved C-VAL 1 baseline used one direct relation:

```text
calibrated alpha -> V
calibrated beta  -> A
calibrated gamma -> L
```

The rejected trial replaced that relation with a feature-classification chain:

```text
orientation + acceleration
  -> quaternion pose
  -> adaptive noise and range estimates
  -> 220 ms motion-energy RMS
  -> burst/cadence detector
  -> learned first-motion direction
  -> stable-pose dwell detector
  -> V/A/L + signed pressure
  -> separate operator orders and market bias
```

It also replaced the direct mobile visualization with a circle, a horizontal
line, a BUY/SELL cursor, and the instructions `SHAKE`, `RHYTHM`, `HOLD`, and
`REVERSE DIRECTION`.

## Directly observed failure

The human runtime session showed:

- waiting state correctly stayed at price `100` with zero participants, orders,
  trades, and depth;
- after activation, pressure repeatedly changed sign or collapsed toward zero
  (`0.19`, `-0.38`, `0.12`, `0`, `-0.01`) during ordinary phone movement;
- V and A decayed to `0` while the person was still attempting to interact;
- L remained fixed for long periods, first at `50`, later `66`, then `11`;
- price usually moved only by hundredths or tenths and frequently lacked an
  intelligible relation to the current gesture;
- the session remained `engaged:true` after the useful input had disappeared;
- no raw sensor trace was successfully saved, so the mapper had not been
  calibrated from the author's actual movement.

The correct judgment is that only the dormant waiting state worked. The core
interaction, mobile interface, and perceived market control failed.

## Low-level causes

### 1. Learned direction was unstable for natural shaking

The mapper stored the angular-velocity direction of the first qualifying
movement as `pressureAxis`. Later pressure was the dot product of current
angular velocity and this hidden axis.

Natural hand movement reverses and changes axes continuously. The same ordinary
shaking gesture therefore produced positive, negative, and near-zero pressure.
The person could neither see the learned axis nor reproduce it. A hidden learned
coordinate system is not a control.

### 2. V represented a time window, not the phone

V was a 220 ms RMS of normalized angular and linear acceleration. Adaptive
noise subtraction, adaptive range scaling, and smoothing intervened before the
number appeared. The displayed value therefore lagged the hand and could decay
even while the person believed they were continuing the same action.

### 3. A required artificial burst timing

A was not a direct axis or current motion value. It increased only when energy
crossed a high burst threshold after first falling below a low re-arm threshold,
then decayed with a 700 ms memory. Ordinary continuous motion could therefore
produce little or declining A. The interaction silently demanded a particular
tempo without teaching or revealing it.

### 4. L required an invisible dwell condition

L updated only when angular speed stayed below 8 degrees per second for 180 ms,
the pose differed from baseline by at least 4 degrees, and a learned pose axis
had been established. During active movement L was intentionally frozen. This
explains the long `50`, `66`, and `11` plateaus and made L impossible to tune in
the same continuous gesture as V and A.

### 5. Engagement latched while useful input disappeared

After 400 ms of baseline calibration and 90 ms above an energy threshold,
`engaged` became true and never returned to false until reset. Meanwhile V, A,
and pressure could decay to zero. The state said a human was controlling the
market while the actual control channel had gone silent.

### 6. The market response was weakened at the same time

The rejected calibration reduced maximum daily information volatility from
`0.65` to `0.12` and private valuation noise from `0.08` to `0.035`. A new
pressure path was expected to supply direction, but real pressure rarely stayed
large or stable. The result combined a weak control signal with a quieter
market, making price feel nearly stationary.

### 7. A second control ontology was added unnecessarily

V/A/L already controlled market conditions. The rejected version added signed
pressure, an `operator-big-hand-1`, pressure-sized market orders, information
bias, and order-side bias. This created two overlapping causal systems:

```text
V/A/L -> market regimes -> agent behavior -> price
pressure -> operator orders + information bias + flow bias -> price
```

The person could not tell which path caused an outcome. The extra path did not
clarify power; it obscured authorship.

### 8. Synthetic tests validated assumptions, not human use

Unit tests generated motion that matched the mapper's own thresholds and axes.
Other tests injected ideal pressure values directly into the market. They proved
that code responded to signals the code was designed to recognize, not that a
person could knowingly produce those signals. Passing tests were incorrectly
treated as evidence of interaction quality.

### 9. Persistent pose was mistaken for ongoing human activity

The quaternion trial combined absolute pose distance with instantaneous motion.
Once the phone had been flipped far from its initial pose, that pose term stayed
large regardless of the next movement. V and inverse L therefore became a
coupled latch, and smoothing extended it. Fresh `signalAgeMs` values near zero
proved transport was working; the mapping was discarding the new information.

### 10. Mathematical coverage displaced the actual experience

The next trial optimized quaternion continuity, angular velocity and formal
coverage of inversion and 360-degree paths. That did not answer the embodied
test: a person holding a phone normally should be able to make the price move
dramatically without performing an idealized full rotation. Numerical V/A/L
range coverage was mistaken for enjoyable causal power.

The attempted correction repeated the same mistake in another form by proposing
small-angle amplification plus separate quaternion and inversion handling. That
would create ordinary and exceptional paths, more conditions, and more ways for
the same movement to feel inconsistent. `Simple is best` here means one causal
relation across the entire movement space, not a simple main path surrounded by
exceptions.

## High-level causes

### The system asked the person to serve the algorithm

The person had to discover an undocumented combination of shake strength,
pauses, rhythm, pose holding, and reversals. That reverses user-centered design.
The system should translate an ordinary, repeatable hand action into a visible
effect; it should not make a person perform for a hidden classifier.

### Complexity replaced perceptual causality

The implementation optimized semantic sophistication—energy, cadence, pose,
and pressure—rather than the embodied question: “When I move this, do I see
that change now?” Every intermediate state increased delay, ambiguity, or
failure modes without creating a clearer experience.

### Too many variables changed in one trial

Sensor semantics, activation, multi-user aggregation, market calibration,
operator behavior, controller language, and mobile visuals changed together.
This violated the repository's bounded-tinkering method and made the degraded
result difficult to attribute or reverse.

### The concept was explained instead of enacted

Labels such as `SHAKE STRENGTH`, `REPEAT RHYTHM`, and `REVERSE DIRECTION` tried
to rescue a non-obvious system with instructions. The power relation should
have been felt through immediate response. Explanatory copy cannot substitute
for causal legibility.

## Why the mobile screen failed

The circle, floating line, and BUY/SELL cursor had no stable one-to-one relation
to the phone's physical orientation. They represented hidden derived features,
not the object in the user's hand. A person looking at the screen could not
answer:

1. Which physical movement changes V?
2. Which physical movement changes A?
3. Which physical movement changes L?
4. What should I do to repeat the previous result?
5. What movement is causing the market response right now?

The screen must mirror the actual operative bodily relation. Showing three
independent controls again would preserve the V1 ambiguity. The current WIP
mobile displays the direct rotation-rate V/A/L state and actual executed price;
whether that relation is perceptually legible remains a real-phone question.

## Rules derived from this failure

Do not rebuild any of the following without a new, separately approved trial:

- learned first-motion or pose axes;
- RMS windows as the primary V/A/L controls;
- burst, cadence, dwell, or re-arm gates;
- a permanent engagement latch disconnected from current input;
- absolute pose magnitude as persistent V/L activity;
- deriving V and L as simple inverses of one latched intensity;
- signed pressure as a fourth hidden control;
- a privileged operator order path in parallel with V/A/L;
- simultaneous changes to input semantics and market calibration;
- synthetic gesture tests presented as human validation;
- abstract mobile graphics whose motion is not a direct mirror of the sensor
  values that control the system.
- ranking small ordinary movement above full-direction response, or the reverse;
- separate rules for small angles, large turns, inversion, or named edge cases;
- treating V/A/L numerical span or coordinate correctness as proof of fun.

## Recovery principle

Keep the proven dormant-market lifecycle and market path. The current direct
rotation-rate replacement is WIP and not yet accepted. It must satisfy this
exact chain:

```text
any ordinary or full-range phone movement
  -> the same simple fixed mapping
  -> immediately substantial V/A/L and market drive
  -> ordinary agents and FIFO order-book mechanics
  -> executions
  -> price
```

One visible input, one market path, one result. Further changes must vary only
one coherent relation and must be judged with a real person holding the phone.

The replacement trial has four explicit acceptance gates. It is rejected if
any one fails:

1. ordinary small movement produces immediate, dramatic executed-price range
   comparable to or stronger than the useful Git baseline;
2. pitch, roll, twist, inversion, 180/360-degree turns and combinations remain
   materially responsive under that exact same mapping;
3. opposite repeatable movements produce perceptibly opposite price tendencies;
4. no hidden classifier, mode, per-angle branch, exception list, delay, or
   second control channel is introduced.
