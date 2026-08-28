# C-VAL installation entry poster — 2026-08-28

## Entry contract

The four-screen installation has one participant entrance:

```text
https://c-val.vercel.app/mobile
```

The phone asks for motion permission, then its rotation changes the live
volatility, activity, liquidity, and resulting market movement. The surrounding
installation makes that change visible across its four screens. This is one
shared installation entry, not a per-location attribution flow.

## A4 copy

The separate C-VAL option in `ddong-meong`'s `/qr-generator?project=c-val`
prints:

```text
C-VAL
Conducting Volatility, Activity, Liquidity

QR 스캔 후
휴대폰을 돌려보세요.

V/A/L 값이 바뀌며 주가가 움직입니다.
```

The first line tells the participant the exact physical sequence. The second
states the visible market consequence without turning the poster into an
explanation of the installation.

## Reusable QR asset

`public/qr/c-val-mobile-entry.svg` and its 2048px PNG counterpart
`public/qr/c-val-mobile-entry.png` encode the exact URL above. Both keep a
white quiet zone with no black outer border and remain independent from the
external QR service used by the in-installation waiting screens.

## Bounded change record

- Kept: `/mobile`, sensor permission, rotation-to-V/A/L mapping, socket state,
  and all four installation screens.
- Added: a print entrance and a portable SVG representation of the existing
  mobile route.
- Observe on site: whether the immediate physical instruction is sufficient for
  people to scan, grant motion access, and connect their first rotation to the
  shared screen response.
