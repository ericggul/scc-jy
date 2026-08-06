# C-VAL 2 rollercoaster screen

> Current redesign date: 2026-08-06
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
   a chart. Each of the 28 chronological price samples is a rail vertex; two
   true rails, sleepers, sparse support frames, and visible running/guide/
   up-stop wheels make the car materially dependent on that history.
6. **System family:** the same C-VAL 2 socket snapshot drives rollercoaster,
   news, and media. The controller's `#20BD68` gain and `#E94A58` loss colours
   are used as a single changing environmental field without adding a new
   control or model variable.
7. **Removal test:** only the two rails, one sleeper per price sample, necessary
   supports, the train, and the colour field remain. The chronological rail,
   car-to-rail contact, and local tangent may not.

## Geometry and motion

- X is chronological sample order and is strictly increasing. It is mapped to
  the viewport width so the full 28-point rail touches the left/right visual
  field on both the whole-screen pane and the standalone route.
- Y is a stable soft log return from the opening price. Price input is bounded
  to the physical installation range `$1–$100,000`; ordinary movement stays
  legible while any valid extreme remains inside the same camera field. The
  camera never chases a rolling min/max.
- The rail uses every sample in the latest 28-sample window. It does not
  simplify, resample, or generate decorative oscillation.
- Incoming prices are briskly but continuously damped into the displayed rail.
  Rails, sleepers, and supports are allocated once and their typed vertex or
  instance buffers are updated in place on animation frames.
- The three cars remain coupled to the latest end of the price rail, positioned
  directly on the curve so the running wheels touch the rail. There is no
  autonomous lap, camera shake, or conveyor motion independent of executed
  prices.
- The background changes smoothly toward the controller's green on a rise and
  red on a fall; the chassis remains materially neutral so the price signal is
  strong without turning the rail into a coloured chart.
- Reduced-motion preference applies the latest prices and train transforms
  without temporal interpolation.
- Presentation remains browser-owned. No track point, color, car angle, or
  animation state is added to the socket protocol.

## Whole-screen composition

C-VAL 2 now has three surrounding screens. In `/c-val/2/screen/whole`, the
rollercoaster occupies the full left height because it carries the common price
trajectory; news and media occupy the two right panes as social consequences.
C-VAL 1 retains its archived four-screen contract unchanged.

## Current result and unresolved question

The direct `market` graph and C-VAL 2 `employment` screen were removed. The
legacy route remains available at `/c-val/2/screen/rollercoaster-legacy` as a
preserved two-dimensional Canvas trial and is excluded from the active whole
composition. The active route uses a responsive perspective camera, saturated
market-colour field, and deliberately sparse studio architecture: no city,
crowd, dashboard, labels, logo, particle field, or environmental decoration.

The redesign changes only surrounding representation and rendering. It does
not alter phone input, V/A/L equations, market agents, execution logic, or
transport.

The visual research ledger and full design contract are in
[`2-rollercoaster-references.md`](./2-rollercoaster-references.md). It records
43 retained visual references and the non-copying rules used to derive the new
scene.

## Rejected trial: streaming/log-domain pass

The 2026-08-06 pass combined four changes at once: a rolling log-price domain,
horizontal conveyor motion, an autonomous four-second train loop, and a broad
geometry/performance rewrite. It was rejected because the train no longer read
as a direct consequence of the shared price, the moving rail weakened the
price-as-physical-track relation, and domain rescaling introduced another
source of visible instability. Combining those variables also made the visual
failure impossible to attribute cleanly. It is not the active implementation.

The current unresolved question is visual, not conceptual: whether the new
camera's rail occupancy and the fast, smooth price interpolation feel forceful
under live phone input without confusing the train's causal attachment to the
latest price. That needs to be judged from the HTTPS route.
