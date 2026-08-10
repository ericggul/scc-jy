# C-VAL 2 casino screen — three-digit price

> Date: 2026-08-10
> Route: `/c-val/2/screen/casino`
> Preserved baseline: `/c-val/2/screen/casino-legacy`

## Experiment contract

- **Participant situation:** a surrounding installation screen is read at a
  distance while phone movement drives the C-VAL market.
- **Primary parameter:** the latest executed market price, `market.index`.
- **Perceptual job:** notice rapid changes in the current price as a single
  three-digit quantity.
- **Interaction job:** none on this screen; it remains a read-only consequence
  of the existing phone-to-market interaction.
- **Wrapper justification:** three mechanical number drums make fast discrete
  price changes legible as a physical slot-machine event without inventing a
  wager, outcome, return, or jackpot.
- **System family:** the legacy casino's black lacquer, chrome, warm gold, deep
  navy glass, red enamel, and blue LED material language is retained.
- **Removal test:** the sign, percentage, decimals, secondary reel rows, mode
  controls, status plate, labels, and lower deck are absent because none is
  required to read the three-digit current price.

## Data and representation

The screen rounds the real current execution price to the nearest integer and
pads it to exactly three digits:

```text
153.49 -> 153
242.60 -> 243
32.00  -> 032
3.00   -> 003
```

The fixed three-drum artifact clamps exceptional values to `000…999`; the C-VAL
2 market operates around an initial index of `100`, so this protects the visual
contract without altering server state. Each digit always remains present in
its own DOM cell. A 30 ms mechanical count advances forward through `0…9`
toward the newest price digit, so 20 Hz input updates change the target without
removing, cross-fading, or restarting the visible numeral.

## Preserved baseline

The complete five-reel `CHANGE`/`PRICE` implementation and all of its assets,
tests, motion code, and failure record were moved unchanged to
`components/c-val/2/screen/casino-legacy/` and remain addressable at
`/c-val/2/screen/casino-legacy`. It does not import from the new experiment.

## New asset record

- Project asset:
  `components/c-val/2/screen/casino/assets/casino-three-reel-chassis.png`
- Built-in image generation used the former five-reel chassis only as a visual
  family reference. The result is a new 1672 × 941 image, not an edit of the
  archived asset.
- Prompt contract: full-screen, front-facing premium casino cabinet; exactly
  three equal single-symbol apertures; no secondary rows, payline, text,
  symbols, numbers, lower controls, balances, betting UI, or watermark; retain
  black graphite, chrome, gold, navy glass, red enamel, bulbs, and blue LED
  separators.

## Unresolved observation

Verify the three-drum cadence against active phone input at installation scale.
The next question is whether 30 ms forward counting reads as a physical reel or
needs a slower mechanical dwell without sacrificing the rapid market relation.
