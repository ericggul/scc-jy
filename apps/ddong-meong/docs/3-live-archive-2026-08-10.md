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

## Disengagement boundary

The mobile reader treats `visibilitychange` and bfcache page transitions as a
pause, not an exit. A real page unload is recorded as a leave. The same signal
is sent by Socket.IO and a small `sendBeacon` request, so iOS lock/background
transitions retain a delivery path when JavaScript is suspended. Socket
disconnect is the final fallback: a paused session becomes `backgrounded`; an
otherwise active session becomes `left`.

The pause is a shared clock stop, not merely a label: the mobile reader's
timer, scrolling text, BGM and background time all freeze at the same moment.
The socket session stores the pause start and accumulated pause duration, so
the screen's live clock freezes too and archived duration excludes it. The
screen calls that state `똥 끊김`.

After at least one direct drop interaction, 60 seconds without another direct
input is represented as an in-progress `idle` state. It does not end the
session; another input resumes it. The screen maps the resulting domain states
to `똥 끊김`, `똥멍 때리다 멈춤`, `똥 싸다 나감`, and `똥 다쌈`.

## Retained invariants

- Existing mobile routes, reader timing, BGM handling, interaction mechanism,
  flush sequence and text remain intact.
- The `ddong-meong:3` socket event prefix and its isolated room remain intact.
- The screen and mobile retain the same local design system: Pretendard, the
  wordmark font, brown field, warm cream surfaces and restrained rounding.
- The screen QR is generated in-browser from its current origin plus the
  experiment-owned `ddongMeongThreeEntryPath` constant. Changing the
  experiment route later changes this one constant rather than a copied URL.

## Archive boundary

The exhibition screen retains up to 500 completed records in its own browser
`localStorage` for seven days. It merges the socket's current-process session
feed into that cache, while exposing only records whose end date is today in
Asia/Seoul. The socket server keeps no file-backed archive: it provides live
state and the current process's completed-session feed only.

This is intentionally a single-screen, short-lived archive rather than a
global record. Clearing that browser's site data, using another browser, or a
screen remaining offline while the socket process restarts loses records that
were not already received by the screen.

## Unresolved question

Does the exhibition screen need a deliberate acknowledgement when a person
flushes, beyond moving that entry from the active list to today's record?
