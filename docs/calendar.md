# Calendar

## Routes

- `/calendar/default`: the original single-device calendar, preserved unchanged.
- `/calendar/mobile/1`: the mobile five-column life-profile directory.
- `/calendar/screen/1`: the synchronized calendar display.
- `/calendar/1/mobile`: compatibility alias for the mobile field.
- `/calendar/1/screen`: compatibility alias for the synchronized display.
- `/calendar/1`: compatibility alias for the variant 1 screen.

The mobile viewport is intentionally defined by `VISIBLE_COLUMNS` and
`VISIBLE_ROWS` in `components/calendar/1/data.ts`. It currently selects 3 × 30
profiles. The full 2,500-profile directory is three columns by 834 rows and only
scrolls vertically. Each record is divided into name and synthetic resident
registration-number fields and styled as a monochrome Korean administrative
ledger: white paper, black rules, the installed AppleMyungjo face for names,
and the installed AppleGothic face for centered numbers.
The numbers are deterministic fictional identifiers whose final digit
intentionally fails the legacy checksum; they are not records of real people.
Profiles are sorted with a Korean collator, then alternate
left-to-right and right-to-left on successive rows so alphabetical order follows
a continuous vertical snake. Changing the constants updates the local viewport;
the socket validates the supplied total grid and bounded `rows × columns`
window rather than hard-coding 90 records. The final partial row is allowed to
send fewer records without invalidating the socket payload.

## Synthetic population

The 2,500 profiles are deterministic fictional NPCs, not records of real
people. Stable IDs are created before the population is shuffled into the grid,
so duplicate human-readable names cannot collide as React keys or socket IDs.

The generator is calibrated from these Ministry of Data and Statistics sources:

- [2024 Population and Housing Census](https://mods.go.kr/board.es?act=view&bid=203&list_no=437767&mid=a10301010000): 51.81 million people on 2024-11-01.
- [2024 life-stage administrative statistics](https://mods.go.kr/board.es?act=view&bid=11895&list_no=442561&mid=a10301060100): ages 15–39 are 28.9%, 40–64 are 40.3%, and 65+ are 20.1%. The 0–14 share is the 10.7% remainder.
- [2024 Life Tables](https://mods.go.kr/board.es?act=view&bid=208&list_no=439533&mid=a10301010000): life expectancy is 80.8 years for men and 86.6 years for women, with the published five-year remaining-life values used for interpolation.
- [2025 provisional birth and death statistics](https://mods.go.kr/board.es?act=view&bid=204&list_no=443686&mid=a10301010000): 254,500 births and 363,400 deaths. These are the latest movement figures available as of 2026-07-10; the release states that finalized figures are due later in 2026.

The generator exactly allocates the four broad age shares at the 2,500-person
scale, then uses deterministic weighted sampling inside each band. Death dates
are fictional forecasts sampled around sex- and age-specific remaining life
expectancy as of the census reference date. They are an artistic simulation,
not individual medical predictions. Names use weighted common surnames and
curated cohort-appropriate given-name pools; those name weights are a realism
device, not an asserted official name-frequency table.

The population structure remains anchored to the latest completed annual
registered-census result (2024), while the separately stored 2025 provisional
movement figures provide the newest directional context. The generator does not
mix the later provisional totals into the earlier census denominator.

## Events

Every profile owns four event definitions in `LifeEventStore`:

1. `birth`: one occurrence on the exact birth date.
2. `birthday`: annual recurrence beginning the year after birth.
3. `death`: one occurrence on the predicted death date.
4. `memorial`: an annual recurrence of the profile's scheduled death month and
   day, beginning the year after birth. This is the experiment's speculative
   inverse-birthday rather than a conventional memorial that starts only after
   death, so its annual density matches birthdays for the same selected cohort.

The screen always supports `birth`, `birthday`, and `death`. Its upper-right
`기일` control adds or removes `memorial` without changing profile data or
socket state. The control is on by default, so annual birthdays and annual death
anniversaries appear together.

The screen offers two display modes from the upper-right control. `Event` keeps
the original compact cards and animates those cards on selection updates.
`Cell` colors and flashes the entire date cell; overlapping event kinds split
the cell background into semantic color bands with narrow blended seams. Two
independent color layers crossfade, preventing rapid socket updates from
interpolating or corrupting a single background layer. Birth, birthday, and
death use a sunburst, cake, and memorial-stone SVG mark respectively, avoiding
platform-dependent emoji rendering and clipping.

The upper-right sound control is off by default. Enabling it from a user gesture
lazily creates one Web Audio context. Newly added birthdays produce a short high
tone and newly added memorials a short low tone. Updates inside a 140 ms window
are coalesced into one cue with at most two oscillators, so rapid mobile scrolling
cannot create audio work per profile or per event. Disabling the control suspends
the context; unmounting the screen closes it.

## Socket isolation

Calendar uses only `calendar:*` events and the room
`experiment:calendar:1`. The server stores the latest validated profile
selection per calendar variant. A reconnecting screen receives that state in
the hello payload. Only clients joined as `mobile` may update selection, and
payloads are bounded, deduplicated, and validated before broadcast. No generic
signal event or room from another experiment is used.
