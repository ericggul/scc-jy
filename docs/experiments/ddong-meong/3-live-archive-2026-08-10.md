# ddong-meong/3 — live sitting archive, 2026-08-10

## Trial

Connect the mobile meditation reader to the existing experiment-scoped Socket.IO
room, then make the exhibition screen an actual shared view of current and
same-day sessions.

## Changed relation

```text
mobile content entry
  -> named session with content identity
  -> phase and interaction updates
  -> flush / completion / departure archive entry
  -> screen's live and same-day views
```

The socket server only stores domain state: nickname, browser participant ID,
content identity, start/end times, elapsed duration, interaction count and
session outcome. The screen derives elapsed clocks and visual state locally.

## Retained invariants

- Existing mobile routes, reader timing, BGM handling, interaction mechanism,
  flush sequence and text remain intact.
- The `ddong-meong:3` socket event prefix and its isolated room remain intact.
- The screen and mobile retain the same local design system: Pretendard, the
  wordmark font, brown field, warm cream surfaces and restrained rounding.

## Archive boundary

The server writes up to 5,000 records to
`data/ddong-meong/3/archive.json` when its runtime filesystem permits it. The
screen exposes only records whose end date is today in Asia/Seoul. If the
runtime has no writable disk, the same view remains available for the lifetime
of that socket process.

## Unresolved question

Does the exhibition screen need a deliberate acknowledgement when a person
flushes, beyond moving that entry from the active list to today's record?
