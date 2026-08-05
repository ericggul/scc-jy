# C-VAL 2 working baseline — 2026-08-04

This record preserves the working C-VAL 2 sensor-to-market relation before the
next orientation-mapping trial. It is an archive record, not a proposal for the
next implementation.

The exact live sources are recoverable from Git commit `07a5aaf` (`Fix: C-Val
2`). Restoration must be scoped to the C-VAL 2 sensor files rather than applied
to the whole repository.

## Preserved state

- Route: `/c-val/2`
- Date: 2026-08-04
- Observed working condition: a trusted mobile HTTPS connection reaches the
  versioned C-VAL 2 Socket.IO room and changes the shared market.
- Preserved invariants: dormant market before the first intentional input;
  server-owned abstract market state; execution-derived displayed price; no
  upper price cap; price floor of one tick (`0.01`).

## Exact current sensor path

The first valid `deviceorientation` event is stored as the local baseline.
Subsequent samples are calibrated as:

```text
alphaDelta = wrapped signed difference(rawAlpha, baselineAlpha), in [-180, 180)
betaDelta  = rawBeta  - baselineBeta
gammaDelta = rawGamma - baselineGamma
```

Although all three calibrated values are retained, **only `betaDelta` currently
controls V/A/L**:

```text
d = clamp(betaDelta / 35, -1, 1)
i = abs(d)

V = 0.5 + 0.5 * i
A = 0.5 + 0.5 * d
L = 0.5 - 0.5 * i
```

Therefore the actual reachable relation is:

| Calibrated beta | V | A | L |
| ---: | ---: | ---: | ---: |
| `<= -35°` | 100 | 0 | 0 |
| `-17.5°` | 75 | 25 | 25 |
| `0°` | 50 | 50 | 50 |
| `+17.5°` | 75 | 75 | 25 |
| `>= +35°` | 100 | 100 | 0 |

The mapping is linear only inside `-35° < betaDelta < +35°`. Outside that
interval it is hard-clamped. V does not reach 0, L does not reach 100, and the
three values are not independent. Alpha and gamma do not affect them.

The mobile sends at most once per 16 ms. Input becomes intentional when
`abs(betaDelta) >= 2°`. Multiple current phones contribute an equal arithmetic
mean. A phone contribution becomes stale after 450 ms. The server approaches
the current target exponentially at response rate 8 per second; at the 50 ms
market tick this closes about 33% of the remaining distance on each tick.

## Exact current V/A/L-to-market path

The shared directional condition is:

```text
signedA  = 2 * (A - 0.5)
vGain    = 0.25 + 0.75 * V
lGain    = 1 - 0.75 * L
direction = clamp(signedA * vGain * lGain, -1, 1)
```

Under the current coupled beta mapping this simplifies to a monotonic but
nonlinear function of `d`:

```text
direction = d * (0.625 + 0.375 * abs(d))^2
```

Both positive and negative extremes raise effective order activity:

```text
effectiveActivity = 0.5 + 0.5 * abs(2 * (A - 0.5))
```

Every real second represents one market day. The fundamental process combines
mean reversion, a Student-t random innovation, and a directional innovation:

```text
randomShare = (1 - abs(direction))^2
directionalInnovation = direction * 0.035 * sqrt(marketDays)
```

Direction also biases trend and noise participant buy/sell probability. V
changes the volatility regime, valuation dispersion, placement and spread
regimes. Effective A changes event arrival rate. L changes provider share,
quote quantity, replenishment, resting depth and cancellation behavior.

The displayed market index is still the last executed trade. The fundamental
and V/A/L conditions influence participant decisions and the order book; they
do not directly assign the displayed price.

## Known limitation preserved with this baseline

This version is a one-dimensional beta lever, not a model of how a person can
turn a phone through arbitrary 3D orientations. A normal human turn can exceed
35 degrees immediately, so the hard clamp can leave the interface displaying
0 or 100 for long periods while the phone continues moving. Turning the phone
over, rotating it 180 or 360 degrees, twisting around the screen normal, and
moving through Euler-angle discontinuities are not represented coherently.

## Source identity at preservation time

```text
0a5afb1995ae401f6e0e168a1755717291e1cac4df7909e91a7d9d6c69c7e927  components/c-val/2/mobile/index.tsx
bce809ba05ded93f14a61407048583012e13d7c092e18043edddb12a6655f030  components/c-val/2/model/index.ts
f6d4a469a672ff75e81c4bf11f35e429a472578d1178eae5f364c9fb061d1cc5  components/c-val/2/transport/use-socket.ts
588fa24eb749808d3fd3576d29f81d0259e8eabdec637c1353d8790242861af0  socket/experiments/c-val/2/orientation.mjs
7128f61759366b653f202996dacb580245fb926c82a640ab94b3181f38ea8636  socket/experiments/c-val/2/index.mjs
3d509498e46acfc3858042334cebccada5b60b12c869f444aa7c3592995430d2  socket/experiments/c-val/2/multi-user-control.mjs
d93943bd16a536f5d14c6029acb7c8b8cd068dc37aeb4fba8337ecbc8cd1ce40  socket/experiments/c-val/2/model.mjs
a5f695e871ec0099b1942e3afedf590e02ea6336ad23d87dcd3dc931e0decd5e  socket/experiments/c-val/2/calibration.mjs
fcbad1f533e7757f6f0e4c687e5aa6423edaea1e90544125be60f6da4a0c099d  socket/experiments/c-val/2/order-book.mjs
```

## Next unresolved question

How should a full 3D, time-varying human phone gesture—including inversion,
180-degree turns, complete 360-degree paths, pauses and reversals—produce a
simple, learnable and non-saturating market direction and intensity without
asking the participant to understand V/A/L?
