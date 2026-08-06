# C-VAL 2 external publisher

> Date: 2026-08-06  
> Tested relation: an execution-derived C-VAL market condition crosses from the
> installation into an artist-owned public channel as an explicitly generated
> Korean social echo.

## Why this is not a simulated comment UI exported unchanged

The C-VAL screen family contains internal representations: the news feed,
media grid, rollercoaster, and casino reel all derive browser-only presentation
from the shared simulated market. The external publisher changes the material
condition: a message becomes a record in a separately operated communication
service, where people may encounter and answer it outside the installation.

That boundary only matters if it is visible. The outgoing text therefore names
itself `C-VAL / 외부 관측 기록`, calls the utterances automatically generated
simulation responses, and says that they are neither actual user speech nor
investment judgment. It uses the bot identity `C-VAL 관측봇`; it never creates
fake human accounts, manufactured likes, historical timestamps, or unmarked
consensus.

This retains the relevant artistic tension—one bodily movement produces a
market, then a socially legible residue—without treating an unrelated community
as material to be silently flooded.

## Bounded implementation

`socket/experiments/c-val/2/external-publisher.mjs` is the only new outbound
boundary. It receives the already execution-derived snapshot after the regular
50 ms C-VAL step and changes nothing in the market runtime, phone input,
V/A/L mapping, order book, or socket payload.

It publishes only when all of the following are true:

- the market is active;
- an artist-owned Discord webhook is explicitly enabled by environment;
- the cumulative execution move changes one of the five social regimes, or the
  one-second execution move increases into a sharp/violent band;
- the last publication was at least 15 seconds ago (configurable only upward,
  up to five minutes).

Every message contains three Korean generated echoes, exact execution-derived
price/change values, a trigger label, run/revision provenance, no mention
parsing, a sequential queue, and one retry after a Discord rate-limit response.
It is inactive with no network request unless both configuration variables are
present and the webhook URL has a Discord webhook shape.

## Operator configuration

The socket relay is a separate Node process, not a Next route. Provide these
environment variables to its process manager; do not expose the webhook URL as
`NEXT_PUBLIC_*` or commit it to the repository.

```text
C_VAL_2_EXTERNAL_PUBLISHER=discord
C_VAL_2_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/<id>/<secret>
```

Optional:

```text
C_VAL_2_EXTERNAL_SOURCE_URL=https://<public-c-val-route>
C_VAL_2_EXTERNAL_PUBLISHER_COOLDOWN_MS=30000
```

The Discord channel must be artist-owned, publicly disclosed as a C-VAL
simulation channel, and moderated as a Korean conversation space. The webhook
URL is a credential: regenerate it if it is ever exposed.

## Retained invariants and unresolved question

- C-VAL remains an execution-driven continuous double auction; no post mutates
  price or feeds a reaction back into V/A/L.
- The phone remains the only participant market input.
- Screens remain presentation-only; no external delivery state crosses into the
  browser socket protocol.
- C-VAL 1 and all existing C-VAL 2 routes remain untouched.

The next artistic question is empirical: whether explicitly marking the bot as
simulation makes the channel feel like a meaningful public residue rather than
another internal news screen. That needs an invited, moderated audience—not
synthetic volume.
