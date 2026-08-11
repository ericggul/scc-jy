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

`corpus.ts` constructs a fixed, deterministic archive of 4,608 stable-ID
entries:

```text
16 rooms × 8 regimes × 9 market observations × 4 room-specific continuations
```

These are pre-authored combinations, not generated sentences, remote posts, or
runtime model output. The same corpus ID always resolves to the same author and
text. All normal entries are profanity-free. Actual snapshot values are added
at admission time as current price, one-second move, or move from open; this
keeps the utterance grounded in C-VAL rather than a fictional ticker.

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

The 4,608 ordinary entries contain no `씨발`. Existing Cedar and Marin audio is
not loaded until the absolute one-second move approaches the voice boundary.
At `|move| >= 6%`, an extreme text admission may be replaced by one of the 1,248
recorded exclamations:

- upward extremes select positive or mixed high-arousal performances;
- downward extremes select negative or mixed high-arousal performances;
- visible `씨발` is always rendered as `**`;
- only the recorded profanity interval is muted and replaced by the accepted
  1000 Hz broadcast beep;
- voice spacing contracts from 2.8 seconds toward 0.9 seconds as movement
  approaches 30%; playback rate contracts from the old 1.42 maximum to 1.24 so
  the performance does not become a comic pitch effect.

Decoded audio uses a 24-buffer eviction limit instead of an unbounded cache.
Speech and beep share a dynamics-compressor output so overlapping extremes do
not sum directly into the destination. The source WAV files and timestamp
index remain unchanged.

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

- sixteen rooms and exactly 4,608 unique stable corpus IDs and texts;
- matching responsive room admission at 8 × 2 through 2 × 2 widths;
- absence of profanity in the ordinary corpus;
- all eight movement regimes and reversal precedence;
- continuous acceleration with exact movement magnitude;
- market-grounded admitted text;
- the 6% voice boundary and direction-compatible audio valence.

`pnpm exec tsc --noEmit` passes. `pnpm lint` passes with no error; warnings in
unrelated existing files remain outside this trial. Browser/runtime verification
was not performed because it was not requested and repository policy forbids an
agent-started development server.
