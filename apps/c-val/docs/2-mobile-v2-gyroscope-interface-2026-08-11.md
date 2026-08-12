# C-VAL 2 mobile v2 gyroscope interface — 2026-08-11

## Trial boundary

- **Route:** `/c-val/2/mobile/v2`
- **Baseline:** `/c-val/2/mobile`, retained as mobile v1
- **Changed variable:** the mobile presentation of the already-operative
  alpha/beta/gamma-to-V/A/L relation
- **Retained invariants:** device sensor choice, permission flow, three mapping
  comparison choices, calibration, sensor sampling, 16 ms send throttle,
  engagement, recording, socket identity and payloads, multi-phone averaging,
  server runtime, controller, and every screen

This trial does not add another control path or modify the market. Both mobile
interfaces instantiate the same sensor and transport component. V2 receives
only an additional local copy of the already-read three-axis values for its
presentation.

## Design procedure

1. **Participant situation:** a person holds the controlling phone while
   watching both this display and the shared market screens.
2. **Primary relation:** the phone's three current rotation-rate components
   become the coupled V/A/L conditions.
3. **Perceptual job:** distinguish alpha, beta, and gamma immediately, see their
   sign and magnitude, and see whether they reinforce or cancel in the current
   equation.
4. **Interaction job:** enable motion, move the phone, and form a repeatable
   expectation about how the same movement changes V/A/L and the market.
5. **Wrapper justification:** a three-ring gyroscope globe uses the phone's
   actual three-axis sensor grammar. It is an angular-velocity instrument, not
   a decorative world globe and not a phone-pose model.
6. **System family:** the existing mapping selector, V/A/L vocabulary, market
   price feedback, sensor permission, and black/white information hierarchy are
   retained. Alpha, beta, and gamma use fixed print-like axis colors only to
   preserve identity across the globe and numeric readout.
7. **Removal test:** the globe grid, axis rings, raw values, combined quantities,
   exact equations, permission control, market feedback, mapping comparison,
   V/A/L outputs, and v1/v2 route links each carry current state or action.
   No caption, badge, fake status, or ornamental chart was added.

## Exact current readout

For the default `CURRENT` mapping the browser uses angular velocity in degrees
per second:

```text
E = |alpha| + |beta| + |gamma|
S = alpha + beta + gamma

V = 50 + 48 * E / (12 + E)
A = 50 + 48 * S / (12 + |S|)
L = 50 - 48 * E / (12 + E)
```

The globe does not integrate these rates into an invented pose. Ring strength
shows the magnitude of each current rate and ring dash direction shows its
sign. The center exposes `E` and `S`; the next three rows show the resulting
V/A/L equations and live values.

Selecting `C-VAL 1` changes the readout to its exact calibrated-orientation
axis mapping. Selecting `07A5AAF` changes it to the exact beta-only checkpoint
mapping with its clamped `d`. These remain temporary author comparisons inside
the same C-VAL 2 runtime.

## Result and unresolved question

Static verification establishes that v1 remains the default route, v2 is an
additional nested route, the visual presenter uses the same production mapping
function for current `E` and `S`, and no transport or market source changed.
No real-phone visual or interaction acceptance claim is made because browser
testing was not requested. The unresolved question is whether, on the actual
phone, the globe and equations remain readable during movement and make the
movement-to-market relation more obvious than v1.

## Palette revision — 2026-08-11

The first light calibration-sheet surface was rejected. V2 now uses C-VAL's
existing Bloomberg-informed palette without adopting the workstation wrapper:
black ground, warm off-white records, amber for the active mapping and alpha,
green for beta and positive movement, cyan for gamma and liquidity, and red
only for negative or disconnected state. The gyroscope layout, equations, and
all interaction behavior remain unchanged.

The first dark revision was also rejected because it reproduced the prohibited
AI-dashboard hierarchy: connection and listener metadata, multiple tiny labels,
small equations, and a second duplicate V/A/L summary competed with the actual
relation. The revised surface removes that metadata and duplicate summary,
removes ornamental dashed ring treatment, enlarges the three raw axis readings,
and makes each V/A/L equation and its current result one primary row. The
remaining hierarchy is version/mapping choice, globe input, and calculation.
Each row spells out `V — VOLATILITY`, `A — ACTIVITY`, and `L — LIQUIDITY` at
the primary label size; the symbols never appear as unexplained shorthand.
