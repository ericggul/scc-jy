# C-VAL 2 — idle closing auction and cumulative phones

- **Baseline:** the live V2 market accepted one current mobile packet or the
  arithmetic mean of simultaneous packets, then remained active after phones
  stopped sending.
- **Variable:** active controls now add their signed displacement from neutral
  V/A/L. A mobile joining alone leaves the runtime dormant; its first
  `engaged` control packet opens the market. Once no contribution remains, the
  current timing trial holds the neutral active market for 30 seconds, then
  enters `closing-auction`: it stops order generation and preserves the last
  execution-derived price, order book, and history. It neither interpolates a
  price to `100` nor resets the runtime. A later `engaged` control packet
  resumes that same market.
- **Invariants:** existing mobile mappings, recording commands, screen routes,
  market execution mechanics, and role/room event namespaces remain intact.
- **Observed result:** a phone disappearing cannot replace another active
  contribution; once no contribution remains, the displayed market retains its
  final execution-derived state and becomes silent in `closing-auction`.
- **Entry condition:** waiting comments rooms and the waiting media field show
  a centrally placed QR entry point for the current host's `/mobile` route.
- **Unresolved question:** in a live installation, assess whether the temporary
  30-second quiet hold and frozen `closing-auction` match the pacing of the
  room, and whether a later real closing-auction mechanism is needed.
