# Calendar

## Routes

- `/calendar/default`: the original single-device calendar, preserved unchanged.
- `/calendar/mobile/1`: the mobile 50 × 50 life-profile field.
- `/calendar/screen/1`: the synchronized calendar display.
- `/calendar/1/mobile`: compatibility alias for the mobile field.
- `/calendar/1/screen`: compatibility alias for the synchronized display.
- `/calendar/1`: compatibility alias for the variant 1 screen.

The mobile viewport is intentionally defined by `VISIBLE_COLUMNS` and
`VISIBLE_ROWS` in `components/calendar/1/data.ts`. It currently selects 3 × 10
profiles. Changing those constants changes the local viewport calculation; the
socket contract remains a list of stable profile IDs plus viewport metadata.
The server validates any bounded `rows × columns` window rather than hard-coding
30 records, so changing those constants does not require a socket rewrite.

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
4. `memorial`: annual recurrence beginning the year after death.

The screen currently materializes only `birth`, `birthday`, and `death`.
`memorial` remains a first-class stored recurrence and can be enabled by passing
it in the `kinds` option without changing profile data or socket state.

The screen offers two display modes from the upper-right control. `Event` keeps
the original compact cards and animates those cards on selection updates.
`Cell` colors and flashes the entire date cell; overlapping event kinds split
the cell background into corresponding color fields. Birth, birthday, and
death use a sunburst, cake, and memorial-stone SVG mark respectively, avoiding
platform-dependent emoji rendering and clipping.

## Socket isolation

Calendar uses only `calendar:*` events and the room
`experiment:calendar:1`. The server stores the latest validated 30-profile
selection per calendar variant. A reconnecting screen receives that state in
the hello payload. Only clients joined as `mobile` may update selection, and
payloads are bounded, deduplicated, and validated before broadcast. No generic
signal event or room from another experiment is used.
