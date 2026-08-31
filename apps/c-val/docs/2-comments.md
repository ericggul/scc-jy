# C-VAL 2 parallel comments screen

Date: 2026-08-11

Route: `/c-val/2/screen/comments`

Preserved predecessor: `/c-val/2/screen/comments-legacy`, rendered from
`components/c-val/2/screen/comments-legacy` through the archived-screen
registry. It remains separate from the accepted parallel-chat implementation.

## Accepted trial

The former single typographic exclamation field has been replaced by a parallel
conversation archive. The screen asks one precise question: how does the same
execution-price movement propagate through different Korean retail-investor
rooms at the same time?

```text
actual one-second execution-price move
  -> continuous shared social cadence
  -> flat / rise / rally / surge / fall / selloff / crash / reversal
  -> deterministic room and authored-message selection
  -> sixteen bounded room archives
  -> extreme-only censored voice performance
```

This remains browser-owned presentation. It does not alter mobile input, V/A/L,
agents, matching, calibration, market state, or socket payloads.

## Screen geometry

The base 1920-ish landscape composition is eight portrait chat windows across
by two rows: `8 × 2 = 16` simultaneous rooms. Each cell is approximately
240 × 540 at 1920 × 1080 before its one-pixel gap, so the individual artifact
keeps a phone-like vertical proportion inside a horizontal observer screen.

The grid always keeps two rows. Container-width steps reduce only the number of
columns and hide the lowest-priority rooms:

| Container width | Visible geometry |
| --- | --- |
| 1680 px and above | 8 × 2 |
| 1470–1679 px | 7 × 2 |
| 1260–1469 px | 6 × 2 |
| 1040–1259 px | 5 × 2 |
| 820–1039 px | 4 × 2 |
| 620–819 px | 3 × 2 |
| below 620 px | 2 × 2 |

A `ResizeObserver` feeds the same width thresholds into the presenter. Hidden
rooms therefore do not consume admissions: a 3 × 2 rendering routes only among
those six visible archives. On activation, the first routing pass gives every
visible room one message before response-speed weighting begins.

The sixteen authored room positions are: opening chat, scalper response,
stock board, office-worker room, campus room, chart review, signal-room
observers, market livestream, long-term holders, futures response, beginner
questions, trapped holders, cash observers, closing-price bets, overseas-market
watch, and silent readers.

The visual grammar is chat-first: author, actual server timestamp, reply target,
and chronological bubbles. Bloomberg-derived choices are limited to density,
monospaced market readouts, compact headers, and semantic amber/green/red. There
are no platform logos, fake online counts, invented LIVE state, decorative
metrics, or simulated controls.

## Corpus model

`corpus.ts` constructs a fixed, deterministic archive of 9,216 stable-ID
entries in two coexisting length layers:

```text
2 lengths × 16 rooms × 8 regimes × 9 observations × 4 continuations
```

The original 4,608 comments remain byte-for-byte present. A separate 4,608-item
short layer was added rather than shortening or deleting the original material.
The original layer has a 39-character median before its market lead; the short
layer has a 22-character median and receives no extra numeric lead or textual
reply prefix. Both lengths share the live selection pool.

These are pre-authored combinations, not remote posts or runtime model output.
The same corpus ID always resolves to the same author and text. All normal
entries are profanity-free. Original-length entries may add an actual current
price, one-second move, or move-from-open lead; short entries rely on the room
header's live readout and stay terse.

Every fourth eligible utterance answers the most recent speaker in that room.
Room archives retain 28 messages each. This yields at most 448 ordinary message
records and DOM keys remain stable even when visible text repeats.

## Regime and direction contract

The current one-second move is classified as follows:

| Absolute move | Positive | Negative |
| --- | --- | --- |
| under 0.15% | flat | flat |
| 0.15–0.99% | rise | fall |
| 1.00–3.99% | rally | selloff |
| 4.00% and above | surge | crash |

If the current and last-admitted moves are both at least 0.4% and their signs
oppose, `reversal` takes precedence. Comparing against the last admitted move,
rather than only the immediately preceding 50 ms snapshot, keeps short turns
from disappearing between chat admissions. Rise families describe delight, relief,
missed-entry anxiety, and accelerating participation. Fall families describe
loss, hesitation, failed support, and anger. The two directions never share a
generic emotional pool.

## Cadence

Comments and news now call the same pure social-cadence function. It uses the
exact absolute `market.oneSecondMovePercent`, not a passed/failed threshold:

- 0% anchors at 400 ms;
- the interval contracts continuously in log space;
- 30% and above reaches a 30 ms floor;
- an eased input reaches the floor without a step at 30%;
- deterministic 0.82–1.24 conversational jitter, with sparse breaths and
  short interjections, breaks the metronomic feel without changing the curve.

One global admission is routed among the visible rooms. The first pass is
round-robin; subsequent passes use an interleaved weighted cycle so reflective
rooms remain slower without being starved. Therefore 30 ms means
roughly 33 total messages per second across the wall, not 33 messages in every
room. Faster-response rooms are weighted more often during motion; reflective
rooms lag. Each room's second, fifth, eighth, and subsequent three-step turns
reply to its immediately previous author, producing actual local exchanges
rather than isolated parallel posts. The selection remains deterministic for a
sequence and regime.

## Extreme profanity and sound

Temporary audition state: `C_VAL_COMMENT_CENSOR_ENABLED` is `false`. The
recorded source interval is therefore neither muted nor replaced by the beep;
the visible `씨발` → `C-VAL` treatment remains unchanged. Set the switch back to
`true` to restore the described audio censoring.

The 9,216 ordinary entries contain no `씨발`. Existing Cedar and Marin audio is
not loaded until the absolute one-second move approaches the voice boundary.
At `|move| >= 2%`, a fast-move text admission may be replaced by one of the
recorded exclamations whose source audio contains an audited profanity interval:

- upward extremes select positive or mixed high-arousal performances;
- downward extremes select negative or mixed high-arousal performances;
- visible `씨발` is always rendered as `C-VAL`;
- only the recorded profanity interval is muted and replaced by the accepted
  1000 Hz base broadcast beep, with its runtime gain set to 70% for final
  listening balance. Its browser envelope is a 12ms fade in/out, followed by
  a subtle 2.5% exponential pitch fall across the censored interval;
- voice spacing uses the same continuous news curve at roughly three times the
  previous density: about 145 ms at 2%, 76 ms at 6%, 45 ms at 10%, and a 30 ms
  floor from 15% onward. A browser monotonic clock, rather than the 50 ms market
  snapshot clock, preserves that 30 ms floor. Recorded phrases are
  therefore intentionally concurrent during a surge or crash, producing a
  crowd aggregation rather than isolated calls;
- upward voice starts at +90 cents and rises on a 1.7-power intensity curve to
  +1200 cents (one octave), keeping ordinary rises restrained while making
  extreme rallies unmistakably high. Its combined effective speed retains only
  50% of the former excess above 1×: approximately 1.03× at +2% and 1.70× at
  +15% instead of 2.40×. Downward voice
  starts at -120
  cents and falls continuously to -360 cents while its playback rate moves
  from 0.96 to 1.06. The split makes rallies brighter and more airborne while
  crashes accumulate as a lower, heavier crowd. The base 1000 Hz censorship
  beep keeps the speech playback-rate multiplier, but receives only 0.3× of
  its detune in cents. Its duration therefore still covers the transformed
  profanity interval, while its pitch stays nearer the recognizable broadcast
  censor tone: at the +15% extreme it is about 1.48 kHz rather than 2.40 kHz,
  and at the -15% extreme it is about 1.00 kHz rather than 0.86 kHz.

Once voice cadence is active, its clock admits two ordinary comments first and
then appends the due `C-VAL` comment as a third record instead of replacing either
ordinary comment. Thus the extreme-state wall retains at least a 2:1 ordinary-
to-voice text ratio while the audio itself can run at the full 145/76/45/30 ms
curve. Outside voice cadence, ordinary comments retain the shared news clock.

The primary diversity axis is the authored `u001`–`u078` script, not dialect.
For each direction and intensity band, Cedar and Marin alternate while the
selector exhausts every situation-compatible script ID once before any script
repeats. Low, middle, and extreme bands expose different combinations of the
thirteen acting styles; their union covers all 78 scripts. The existing eight
dialect performances remain a secondary rotating color for each selected
script and were not expanded. This replaces the previous two-variants-per-
dialect rule that reduced a direction to roughly twelve recurring scripts.

Decoded audio uses a 72-buffer eviction limit instead of an unbounded cache.
The first thirty likely clips are decoded as soon as the boundary is entered.
Each eligible voice request has an independent 50% chance of entering the sound
field; its corresponding visible comment still appears. Up to six speech sources
continue concurrently. When a seventh begins, only the oldest active source is
stopped, preserving the six most recent voices as a single crowd. Speech and
beep share a dynamics-compressor output so overlapping extremes do not sum
directly into the destination. The first user gesture now creates and resumes
the audio context even if it occurs before the market reaches the voice boundary.
The source WAV files and timestamp index remain unchanged.

At the React boundary, each room thread is memoized independently. A new
message re-renders the changed thread instead of rebuilding the other fifteen
message trees; the compact header readouts may still update with each real
snapshot.

## Reference and evidence ledger

No public comment was copied into the corpus. Sources were used to identify
interaction roles, vocabulary classes, and differences between observation,
rumor, analysis, and emotional reaction.

| Source | Evidence type | What was retained | What was not claimed |
| --- | --- | --- | --- |
| [Npay Finance stock-board surface](https://finance.naver.com/item/board.naver?code=005930) | Direct interface observation | A stock board coexists with price, order-book, rise/fall, volume, and disclosure context | Current posts were not bulk-copied or represented as a dataset |
| [News/Social Media Text and Investor Expectations](https://kasba.or.kr/uploads/papers/NODE10547370.pdf) | Peer-reviewed empirical study | Naver board writing contains subjective positive/negative judgments and real-time issue response, unlike formal news language | It does not validate any individual synthetic sentence |
| [Retail Investors’ Information Sharing and Accounting Information](https://kasba.or.kr/uploads/papers/NODE11495784.pdf) | Peer-reviewed empirical study | Boards mix disclosures, analysis, opinion, rumor, and heterogeneous viewpoints; communication and peer diffusion matter | Post volume is not treated as truth or direct causal intent |
| [DC stock-language guide](https://gall.dcinside.com/board/view/?id=neostock&no=1&page=1) | Community-authored historical glossary | Compressed terms around surge, crash, positions, leverage, and overnight holding | Historical definitions are not assumed to be universal or current slang |
| [Blind stock-investment post](https://www.teamblind.com/kr/post/%EC%A0%9C%EA%B0%80-%EB%B8%94%EB%9D%BC%EC%9D%B8%EB%93%9C%EB%A5%BC-%ED%95%98%EB%8A%94-%EC%9D%B4%EC%9C%A0-mn5FyWnk) | Direct public post observation | Workplace identity, contrarian crowd-reading, and self-critique motivate a distinct room voice | Blind users are not treated as one demographic or one sentiment |
| [YouTube live-stream help](https://support.google.com/youtube/answer/2474026?hl=ko) | Official platform description | Live chat is a synchronous participation channel, justifying a faster reaction room | No private or unavailable live-chat transcript was inferred |
| Local `market-commentary.mjs` | Existing C-VAL authored source | Actual price placeholders, stable hashing, recent-template memory, directional pools, and handles | Discord delivery cadence is not reused as screen cadence |
| Local `banpo-xism` comments core | Read-only implementation precedent | Parametric pools, stable IDs, bounded archives, distinct change regimes, and nonuniform cadence | Apartment-specific sentences and UI were not copied |

Everytime and private Kakao/WhatsApp/Discord rooms are access-controlled. Their
content was not scraped or presented as observed evidence. The campus and group
chat rooms are authored interaction archetypes requested for this experiment,
not empirical samples from those services.

## Verification

Pure tests audit:

- sixteen rooms, 4,608 preserved original entries, and 4,608 added short entries;
- matching responsive room admission at 8 × 2 through 2 × 2 widths;
- absence of profanity in the ordinary corpus;
- all eight movement regimes and reversal precedence;
- continuous acceleration with exact movement magnitude;
- market-grounded admitted text;
- the 2% voice boundary, 145/76/30 ms aggregation anchors, the 2:1 minimum
  ordinary-comment ratio, audited profanity presence, direction-compatible
  style bands, all 78 real script IDs across market situations, and the eight
  existing dialect colors for both voices.

`pnpm exec tsc --noEmit` passes. `pnpm lint` passes with no error; warnings in
unrelated existing files remain outside this trial. Browser/runtime verification
was not performed because it was not requested and repository policy forbids an
agent-started development server.
