# C-VAL 2 rollercoaster screen

> Trial date: 2026-08-05  
> Route: `/c-val/2/screen/rollercoaster`  
> Tested relation: the executed-price history is the physical rail carrying
> people, rather than a graph that describes a ride from outside.

## Grounding and interpretive limit

The contemporary reference is not a claim that SK hynix, semiconductor work,
or the Korean exchange is literally a casino. Two documented conditions sit
together:

- SK hynix reported record 2025 revenue and operating profit and attributed
  the growth principally to AI memory and HBM. This is a real industrial and
  earnings basis for market expectation, not merely speculative fiction:
  [SK hynix FY2025 results](https://news.skhynix.com/sk-hynix-announces-fy25-financial-results/).
- Korea permitted single-stock leveraged ETFs in 2026 with strengthened
  investor-protection requirements. The Financial Services Commission named
  the need for prior diagnosis, quizzes, and a checklist, while products tied
  to Samsung Electronics and SK hynix subsequently offered twice the daily
  return. This makes amplified, short-horizon exposure part of the actual
  surrounding market structure:
  [Financial Services Commission, 2026-04-21](https://www.fsc.go.kr/no010101/86751?curPage=4&srchBeginDt=2022-12-&srchCtgry=8&srchEndDt=&srchKey=sj8&srchText=),
  [RISE SK hynix single-stock leverage product](https://www.riseetf.co.kr/prod/finderDetail/44K6).

The rollercoaster is therefore an artistic interpretation of the participant's
exposure to a shared executed price under rapid expectation, concentration, and
leverage. It must not be documented or captioned as proof of investor
irrationality, corporate intent, or a causal account of any real price move.

## Interface contract

1. **Participant situation:** a surrounding-screen viewer watches the
   consequences of phone movement after V/A/L, agents, orders, and executions
   have already produced a price.
2. **Primary parameter:** the latest 28 samples of bounded `history.index`, with
   the last point replaced by `market.index` so the short rail terminates at
   the latest execution-derived price.
3. **Perceptual job:** see ascent, descent, reversal, and short-horizon
   instability as the geometry and bodily angle of one continuous ride.
4. **Interaction job:** none on this screen. The phone remains the sole input;
   this screen never writes market state.
5. **Wrapper justification:** the rail is not a finance costume placed behind
   a chart. Each of the 28 chronological price samples is a rail vertex, the
   leading car targets the final vertex, and its physical rotation follows a
   damped local tangent so execution noise cannot shake the vehicle.
6. **System family:** the same C-VAL 2 socket snapshot drives rollercoaster,
   news, and media. Korean red-for-rise and blue-for-fall semantics are kept
   locally on rail segments without adding a new control or model variable.
7. **Removal test:** only the two rails, one sleeper per price sample, necessary
   supports, a restrained rise/fall center filament, and the train remain. The
   chronological rail, final leading-car target, and local tangent may not.

## Geometry and motion

- X is chronological sample order and is strictly increasing.
- Prices are clamped only for presentation to the realistic `$1–$100,000`
  installation range and converted to log-price before projection. The latest
  28 samples determine a padded local log domain, so ordinary variation remains
  legible while a move spanning orders of magnitude still fits above the floor
  and inside the camera. A higher price is always physically higher. Domain
  expansion is immediate to keep a new extreme visible; contraction uses
  hysteresis so the rail does not breathe around rolling extrema.
- The rail uses every sample in the latest 28-sample window. It does not
  simplify, resample, or generate decorative oscillation.
- Existing price vertices never morph vertically into the next sample. The
  complete rail group translates left every animation frame; at each 90 ms
  sample boundary the offscreen point is dropped and the newest executed price
  enters from the right. This makes the structure scroll continuously instead
  of writhing like an elastic graph. The camera never moves.
- The three-car train traverses the rail independently in roughly four seconds.
  Wheel height is solved against the rail radius, car spacing exceeds body
  length, and position is sampled directly from the current curve so damping
  cannot leave it floating. Only rotation is damped.
- Reduced-motion preference stops autonomous traversal and horizontal
  interpolation but does not stop price updates.
- Presentation remains browser-owned. No track point, color, car angle, or
  animation state is added to the socket protocol.

## Whole-screen composition

C-VAL 2 now has three surrounding screens. In `/c-val/2/screen/whole`, the
rollercoaster occupies the full left height because it carries the common price
trajectory; news and media occupy the two right panes as social consequences.
C-VAL 1 retains its archived four-screen contract unchanged.

## Current result and unresolved question

The direct `market` graph and C-VAL 2 `employment` screen were removed. The
bounded trial changes only the surrounding representation and route registry;
it does not alter phone input, V/A/L equations, market agents, execution logic,
or transport.

The superseded two-dimensional canvas trial remains available at
`/c-val/2/screen/rollercoaster-legacy` and is excluded from the active whole
composition. The current route uses a fixed orthographic camera and a restrained
Three.js studio field with no city, crowd, dashboard, labels, or environmental
decoration.

The unresolved perceptual question is whether the local log domain and its
contraction hysteresis make short-window slopes legible without flattening
ordinary movement or causing visible rescale events when an extreme leaves the
window. Judge that only from the running HTTPS route under real phone input.
