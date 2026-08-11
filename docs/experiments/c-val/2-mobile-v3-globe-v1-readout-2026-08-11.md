# C-VAL 2 mobile v3 — v2 globe with v1 readout

## Trial boundary

- **Route:** `/c-val/2/mobile/v3`
- **Baseline:** mobile v2 at `/c-val/2/mobile/v2`
- **Changed variables:** retain v2's globe proposition but replace its expanded
  equations with the exact v1 bottom V/A/L readout and make the three attitude
  axes perceptible through one spherical reference.
- **Retained invariants:** mapping comparison, market feedback, recording,
  control payloads, aggregation, market runtime, and all screens

## Perceptual brief

- **Participant situation:** a person is holding the same phone they are
  looking at and rotating it in free space.
- **Primary parameter:** the phone's calibrated three-axis attitude relative to
  the pose at permission.
- **Perceptual job:** recognize the resulting attitude first, then see which
  kind of movement changed alpha, beta, or gamma.
- **Interaction job:** moving the phone should make the central object feel
  inertial, as though the display moves around a world-fixed ball.
- **Wrapper justification:** a spherical attitude indicator keeps all three
  rotations in one object without depicting a second phone inside the phone.
- **System family:** black ground, Bloomberg-derived semantic colors, v1 market
  mapping controls and exact v1 V/A/L output remain shared.
- **Removal test:** any line that does not establish a spherical coordinate,
  fixed reading reference, or current axis correspondence must be removed.

## Composition

The central instrument is copied from v2 rather than imported from it, so later
v2 changes cannot silently rewrite this trial. It retains the responsive globe
but replaces the three equal axis rings with a spherical graticule, fixed
reticle, and outer alpha datum. Every center equation remains removed.

The surrounding alpha/beta/gamma numbers show orientation change relative to
the pose at permission. The literal phone silhouette and the later independent
orbit-marker proposal were rejected because both illustrated the interface
rather than matching the experience of rotating a screen held in the hand.

The current globe behaves as one inertial body. As the phone rotates, that
complete frame counter-rotates relative to the moving display, like a heavy
sphere remaining in the world while the phone moves around it. This is why the
sphere uses the inverse calibrated alpha/beta/gamma pose rather than three
independent animations.

The rejected component-arc pass drew three equal colored sweeps on three moving
great circles. Although numerically consistent, it had no stable reading point
and gave three different rotations the same visual grammar. Once the ball
moved, angle origin, direction, and current endpoint became difficult to
separate.

The revised trial extracts the interface grammar of Apollo's spherical FDAI
"8-ball" and conventional attitude indicators without copying cockpit chrome.
A fixed center reticle is the phone/display reference. A graticule rotates as a
single ball beneath it. Alpha is read at the outer circular datum, beta through
the ball's horizontal latitude structure, and gamma through its vertical
longitude structure. Amber, green, and cyan only establish direct axis
correspondence. The additional orientation listener remains presentation-only;
the `CURRENT` mapping still derives V/A/L exclusively from rotation rate and
sends the same control payload as before.

Reference rules were extracted from the [Apollo FDAI
description](https://apollojournals.org/afj/ap16fj/01popup_fdai.html), which
explains how pitch and yaw are read from the ball while roll is read at its
edge, and the [FAA attitude-indicator case
study](https://www.faa.gov/lessons_learned/small_airplane/accidents/N3794N),
which describes a gimbal-mounted ball read against a fixed horizon reference.
The visual surface of either cockpit instrument is not reproduced.

The browser reports intrinsic Tait-Bryan rotations in Z(alpha), X-prime(beta),
Y-double-prime(gamma) order. The world-stabilized frame therefore applies the
negated rotations in inverse Y, X, Z order rather than merely negating the
angles in their original sequence.

Before permission is granted, the globe is covered by a functional blurred
gate and `ENABLE MOTION` remains sharp at its center. The blur disappears with
the gate after access is granted; it is not an ambient visual effect.

The bottom is copied from mobile v1 without approximation:

```text
VOLATILITY INTENSITY   ACTIVITY DIRECTION   LIQUIDITY DEPTH
<current V>            <current A>          <current L>
```

It retains v1's three equal columns, typography, spacing, thin functional
separators, parameter colors, and percentage-scale integer values. V3 removes
v2's expanded formula rows; it does not change how any value is calculated.

## Acceptance state

The route and pure readout are statically verified. No real-phone or browser
acceptance claim is made because runtime browser testing was not requested. The
open question is whether the v1 readout gives the globe enough output context
without the explanatory density rejected in v2's earlier states.
