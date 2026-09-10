# Three-body

Keep this as a direct observation of the declared three-body numerical model: model state, integrator, initial conditions and stable IDs remain independent from camera/rendering. Direct orbit changes view only. Preserve the route’s bounded-performance settings, finite-state checks and field-first screen; do not add charts, explanatory dashboard chrome, or present a numerical trajectory as a measured astronomical prediction.

## /2 — adjustable many-body trial, 2026-09-10

Forks `/1` without changing its Burrau model or presentation. Starts with 20
unequal masses; the visible **Elements** slider changes the count from 3 to 32
and restarts from deterministic initial conditions. Total mass stays 12.
Golden-angle positions fill a compact, uneven disc; radial, tangential and
shear velocity components prevent an initial shared circular orbit without
an immediate radial collapse that ejects outer bodies beyond the field. The
centre of mass and net momentum are removed from the initial state.

This is a softened N-body model, not the Pythagorean initial-value problem:
Plummer softening ε = 0.3 makes close encounters finite, with matching force
and potential energy. Retains adaptive Dormand–Prince 5(4), with absolute /
relative tolerances 1e-8 / 1e-7. The field preserves the coloured bodies,
accumulating trails and optional **force links**. All pairs contribute to
gravity (190 at 20 bodies), but at most 96 of the strongest links are rendered
when their force exceeds 2.5% of the instantaneous maximum. Link opacity and
width scale with that force. The pair register shows the three strongest current
forces with stable IDs. The remaining analytic panels follow the selected node:
one has speed, acceleration magnitude, heading and angular velocity; the other
has kinetic energy, half of each pair potential allocated to that node, and
their local total.

Work is bounded to 32 accepted steps per animation frame, with a 5 ms budget
checked between steps and at most 0.06 model seconds pending. Under load the
model slows rather than accumulating unbounded catch-up work. The field
continues painting each animation frame. The analytic canvases use a 1.25 device
pixel-ratio cap. The former velocity phase plane is replaced by a selectable
node-relative force field. Its numbered selector chooses the node at the center;
that node's present heading maps to +y, and every other node appears at its
instantaneous relative position with a force-weighted link. It keeps no trace,
but its displayed state is interpolated at the animation-frame rate so position
and heading move continuously. The selected-node motion and energy histories
retain 180 samples at 0.14 model-second intervals and redraw at most four times
a second. Device pixel ratio for the field remains capped at 2.
The fixed camera permits outward departures instead of altering dynamics or
constantly rescaling the trails. Reduced-motion preference keeps the scene still.

Validation: scoped ESLint and pure model tests cover initialization,
force/potential consistency and integration stability. Browser appearance,
frame rate and the experiential pace remain unmeasured.
