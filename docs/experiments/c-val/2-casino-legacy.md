# C-VAL 2 casino screen — legacy five-reel version

> Date: 2026-08-06  
> Route: `/c-val/2/screen/casino-legacy`  
> Archived: 2026-08-10, before the three-digit price-only fork  
> Tested relation: the participant can switch one physical slot mechanism
> between the latest one-second **executed** market return and the current
> execution price.

## Participant and parameter contract

The phone remains the only participant input. This surrounding display writes
nothing to the C-VAL market: it receives the same version-owned socket snapshot
as `news` and `media`, then derives browser-only visual state.

`CHANGE` uses `market.oneSecondMovePercent`:

```text
(latest execution / execution at or immediately before the one-second cutoff - 1) × 100
```

This is deliberately not a direct price assignment, a generated slot outcome,
or an invented volatility metric. The server produces the value from actual
FIFO executions. Before activation, or with no current executed move, the
screen presents `—0.00%` and the reels remain still.

`PRICE` uses `market.index`, the current price set by the latest FIFO execution.
It is a participant-controlled alternate reading rather than a replacement for
the immediate change mode. Prices below 100 retain three integer drums with
leading zeroes (`097.89`) so the five physical price reels remain stable. Values
above three integer digits remain complete rather than being clipped.

`market.changeFromOpenPercent` remains rejected because its long-running
accumulation weakens the immediate phone-to-market consequence. The default
one-second execution return supports the legible relation:

```text
phone movement -> V/A/L -> agents + FIFO executions -> one-second return -> reels
```

## Representation and timing

`CHANGE` always occupies five lanes:

```text
[ + / − / — ] [ 3 ] . [ 5 ] [ 5 ] [ % ]
```

The sign comes from the displayed hundredth-rounded return. A move smaller than
one displayed hundredth remains the truthful neutral `—0.00%`; the interface
does not imply a rise or fall the participant cannot read. If the one-second
integer portion exceeds one digit, that complete integer occupies the integer
lane rather than dropping precision.

`PRICE` uses three integer drums and two fractional drums around the current
market range:

```text
[ 0 ] [ 9 ] [ 7 ] . [ 8 ] [ 9 ]
```

The two recessed outer plates built into the machine remain the actual
`CHANGE` and `PRICE` controls, but their visible labels and values are removed.
Their accessible names and pressed state preserve the interaction contract.

The server broadcasts snapshots every 50 ms (20 Hz). The reel target therefore
uses the latest execution values, never the 200 ms history samples. When a
symbol changes, its lane builds a real circular strip beginning with the prior
value and ending with `[previous, target, next]`. A normal digit change passes
one complete 0–9 turn; high movement passes two. Each reel always renders three
complete cells directly: previous, amplified centre, and next. Animation changes
only the three-cell window's sequence index at frame boundaries, so the centre
DOM never disappears and no empty inter-glyph space can cross it. The reel crosses
its numeric sequence
in 105–245 ms with only 10 ms of lane staggering, then the target settles
at the visual centre. Incoming 20 Hz values never cancel an active strip: the
current turn finishes continuously and only the newest queued value becomes the
next target. A snapshot that does not change that lane's symbol does not enqueue
another turn. Reduced-motion preference shows the newest symbol without
interpolation.

The middle member of every three-cell window always receives the amplified
style. Consequently every interim symbol is fully visible at centre even during
rapid motion, without a duplicate layer, mask boundary, or competing timeline.

The five reel overlays do not use an equal CSS grid. Their left edge, width,
top, and height are mapped separately to the perspective-adjusted windows in
the chassis raster, so each target is centred in its own physical cell. The
decimal uses its own baseline coordinate rather than sharing the reel centre.
No animation state, colour, reel position, mode, or layout is sent through the
socket.

## Visual contract

The screen is one manufactured slot-machine face, edge to edge. The chassis is
a dedicated 1672 × 941 raster game asset; HTML is responsible only for the
changing reels, machine name, and two invisible-label controls. This avoids
rebuilding a finished casino art layer as a collection of CSS cards.

Design backbone:

- **Composition:** substantial empty top marquee; one dominant, recessed 5 × 3
  reel well with an unmarked visual centre; an integrated lower deck with two
  equal control plates and one smaller status plate.
- **Materials:** graphite/black lacquer body, polished chrome edges, warm gold
  retaining bars and bulbs, blue LED separators, smoked navy reel glass, and
  small red enamel strips. Light attaches to manufactured parts rather than
  becoming a screen-wide gradient.
- **Colour definition:** `#030303` surrounding black, navy reel cells sampled
  around `#031735`, chrome neutral, warm gold around `#F4BD2D`, controlled red
  around `#D83C22`; green and red remain reserved for actual direction.
- **Typography:** large casino display digits with gold keyline and hard lower
  shadow; small utility type is limited to machine/mode identity. No tiny
  uppercase dashboard furniture surrounds the value.
- **Removal test:** removing the chassis destroys the slot-machine reading;
  removing fake balances, jackpot, betting, paylines, characters, coins, and
  spin controls does not reduce the C-VAL relation, so they remain absent.

There are no jackpot claims, invented winnings, credit/bet metrics, coins,
characters, or user-facing spin button. The machine may look extravagant, but
the displayed outcome remains the actual execution-derived percentage.

## Reference ledger

- User reference 1, modern physical casino cabinets: source for black/chrome
  depth, recessed displays, illuminated side strips, and integrated lower
  hardware.
- User references 2–3, mobile slot game screens: source for the full-screen
  marquee/reel/deck hierarchy and the dominant 5 × 3 symbol matrix.
- [Magic Bottle main UI](https://dribbble.com/shots/16874456-The-Main-UI-for-the-game-Magic-Bottle): five uninterrupted vertical reel lanes,
  illustrated gold frame, theme-specific title asset, and one continuous
  control deck.
- [Slots Casino animated UI kit](https://www.gameassetdeals.com/asset/138609/slots-cassino-ui-animated-gui-game-kit): separate background, icon, button,
  payline, title, reel-blur, and win-animation assets confirm that a polished
  slot UI is an art-asset system rather than CSS surface styling.
- [Slot game design guide](https://art.absolutist.com/blog/essential-elements-slot-game-design/): the 3 × 5 field is identified as the common central playing field and the
  background/control layer should not compete with the symbols.

## Trial and failure record

- **Baseline:** C-VAL 2 active whole composition with rollercoaster, news, and
  media, all driven by the shared execution-derived snapshot.
- **Trial 1 — contained black cabinet, rejected:** type and reels were too small;
  empty surrounding space dominated; it did not read as the supplied game UI.
- **Trial 2 — red lacquer full-screen cabinet, rejected:** solved scale but used
  a broad smooth red/gold gradient, oversized rounded framing, and a generic
  generated-machine look. It was physically implausible and visually vulgar.
- **Trial 3 — flat CSS 5 × 3 grid, rejected and assessed as regression:** copied
  the cell count but discarded the illustrated asset hierarchy, material depth,
  theme art, and integrated controls. Direct review judged it stranger and less
  convincing than Trial 2. The mistake was treating reference analysis as a
  geometry checklist.
- **Trial 4 — archived asset-backed chassis:** a new original machine asset was
  produced from a written composition/material/colour brief and the supplied
  references. Live HTML is limited to five reel lanes and the two truthful mode
  controls. This is a full replacement of the prior rendering path, not a
  restyle of Trial 3.
- **Material trial after Trial 4 — rejected:** direct feedback that the coloured
  result was still slightly vulgar was misread as a request to desaturate the
  machine. A graphite/chrome/champagne version removed most red, blue, and gold
  energy. The user had not asked to remove colour; the colour chassis remains
  current. The correction targets alignment, material discipline, and reel
  motion without neutralising the casino palette.
- **Changed variable:** one additional standalone surrounding-price
  representation at `/c-val/2/screen/casino-legacy`, with a participant-controlled
  `CHANGE`/`PRICE` reading. The active whole composition is explicitly
  unchanged.
- **Retained invariants:** mobile motion input, V/A/L equations, participant
  agents, order book, FIFO execution, price provenance, socket room/events,
  C-VAL 1, news, and media are untouched.
- **Static result:** pure presenter tests establish waiting, positive, negative,
  rounded-neutral, price mode, and the price mode's three fixed integer drums.
  Pure reel tests establish a complete numeric turn, the optional second rapid
  turn, exact target centring, and adjacent-integer travel. Registry tests
  establish the active and archived routes. Type-checking and scoped linting
  validate the client implementation. A 1920 × 1080 HTTPS render confirms that
  all five HTML reel centres coincide with the five illustrated reel cells; it
  does not substitute for observing continuous motion with active input.
- **Unresolved observation:** review the 20 Hz motion with a real active phone
  and at the actual installed display dimensions. The question is whether the
  fast execution changes remain legible as market consequence rather than
  turning the percentage into an unreadable decorative spin.

## Archived asset record

- Project asset:
  `components/c-val/2/screen/casino-legacy/assets/casino-chassis-v6.png`
- The v6 edit removes only the central gold payline and diamond markers. The
  colour chassis, reel geometry, materials, lighting, and lower plates remain
  unchanged.
- Built-in image generation was used once for the project-bound chassis. The
  three user-supplied images were style/composition references, not edit
  targets.
- Prompt contract: original 16:9 premium casino cabinet; full-bleed; empty top
  marquee; exact five-column by three-row empty reel well; hard centre payline;
  two equal empty lower control plates and one smaller centre status plate;
  graphite/black lacquer, deep blue glass, chrome, restrained gold, red enamel,
  warm bulbs, blue LED separators; no text, numbers, symbols, fruit, `777`,
  logos, watermark, fake balance, spin control, generic neon dashboard, or broad
  red/purple gradient wash.
