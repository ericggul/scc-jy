# C-VAL external Discord publisher

> Date: 2026-08-10  
> Relation: C-VAL V2's actual execution stream becomes a paced Korean stock-community conversation in Discord.

## Structure

```text
phone motion
  -> V / A / L
  -> V2 agents + order book + executions
  -> 50 ms execution snapshot
  -> V2 commentary interpreter
  -> C-VAL-wide Discord webhook transport
```

`socket/experiments/c-val/external/discord.mjs` is the C-VAL-wide delivery boundary. It knows only the webhook credential, payload delivery, delivery health, and Discord's rate-limit responses. It has no V2 market logic or wording.

`socket/experiments/c-val/2/external-publisher.mjs` is V2-specific. It reads the already-computed execution snapshot, selects the requested cadence and a comment, and retains only local wording memory. It never changes price, order flow, V/A/L, controls, browser state, or the socket payload.

`socket/experiments/c-val/2/market-commentary.mjs` holds the community register: 145 explicit stock-style handles, 163 condition-specific comment templates, and a Unicode reaction layer. It is deliberately separate from the generic transport so another C-VAL version can use a different public voice without inheriting V2 language.

## C-VAL time and parameters

One real second is one C-VAL market day. The interpreter is called after each 50 ms model step, but text is only sampled at the interval selected from the rolling execution window.

| Message value | Execution source |
| --- | --- |
| current price | `market.index` (last executed price) |
| market-day move | `market.oneSecondMovePercent` |
| market-day low/high | `market.oneSecondLow`, `market.oneSecondHigh` |
| move since the prior emitted comment | prior emitted `market.index` and server time |
| market-day range | `oneSecondHigh - oneSecondLow` relative to current price |

There is no independently generated price or user action. Each sentence binds current price and the rolling market-day move, and longer turns additionally bind the immediately preceding emitted price, elapsed time, or actual rolling range.

## Cadence

The requested interval comes from:

```text
max(
  abs(oneSecondMovePercent),
  abs(oneSecondHigh - oneSecondLow) / currentPrice * 100,
  abs(realizedVolatilityBps) / 100
)
```

| Realized intensity | Requested next message |
| ---: | ---: |
| below `0.05%` | 5,000 ms |
| `0.05%`–`0.15%` | 2,000 ms |
| `0.15%`–`0.50%` | 1,000 ms |
| `0.50%`–`1.25%` | 400 ms |
| `1.25%` or above | 200 ms |

The 200 ms value is the V2 request, not a promise that every outbound HTTP post reaches Discord at 200 ms. Discord sets the live webhook route limit through response headers, which must be read rather than hard-coded. With a non-exhausted bucket, the transport spreads the remaining sends across `X-RateLimit-Reset-After`; a `5 / 1 second` response yields a 200 ms network cadence. With an exhausted bucket or `429`, it waits for the returned reset/retry time and then resumes. During either wait it keeps only the most recent market utterance: it does not build a backlog of stale messages. [Discord rate limits](https://docs.discord.com/developers/topics/rate-limits)

The transport reports its configured/enabled state, queue state, sent/coalesced/rate-limited/failed counts, and a terminal response status. A `401`, `403`, or `404` stops further posts from that process; this avoids continuously hammering an invalid/deleted/unauthorized webhook. Restart after correcting its credential. Other failures back off exponentially and retry with later execution states.

## Commentary stream

The interpreter uses six market states: accelerating up, up, accelerating down, down, reversal, and quiet. Selection also uses the prior emitted direction, last emitted price, and recent template/handle memory.

That gives the stream continuity rather than a single detached ticker voice:

- short bursts when movement accelerates;
- directional reactions whose values match the actual price and market-day move;
- reversal comments that explicitly compare the last emitted price to the current one;
- occasional longer position-like turns in the same numeric condition;
- quiet turns at one or two seconds rather than a separate generic narrator;
- no immediate reuse of the last 24 sentence templates or 12 display names.

The register was rebuilt after comparing the condition-specific, mixed-length template system in the local `banpo-xism` reference and public Korean stock-community material: compact forms, incomplete syntax, price-arrow notation, intermittent `ㅋㅋ`/`ㄷㄷ`/`하...`, disagreement, and longer first-person-like observations coexist. It does not copy a specific participant's post or introduce a fabricated event, news item, holding, or price.

The Discord webhook supports a per-message `username`; each comment uses a different handle from the pool. Fast turns add a denser but non-universal reaction tail such as `🔥`, `🚀`, `ㅠㅠ`, `ㄷㄷ`, `ㅋㅋ`, `👀`, or `🤡`; these are Unicode rather than server-specific custom emoji, so the payload stays portable. No mentions are parsed (`allowed_mentions.parse = []`), content is bounded to Discord's 2,000-character message limit, and names are truncated to Discord's 80-character limit. [Discord webhook execute parameters](https://docs.discord.com/developers/resources/webhook#execute-webhook)

## Configuration

The socket relay is a separate Node process. `socket-server.mjs` loads the ignored local `.env` before registering experiments.

```text
C_VAL_DISCORD=true
C_VAL_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/<id>/<secret>
```

The webhook URL is a credential. Keep it out of source control and regenerate it if exposed. No browser client receives it.

## Current handoff state — 2026-08-10

Discord work stops at this bounded state until a later C-VAL instruction.

- The configured webhook was checked with a read-only request: it returned
  `200 OK` as a standard Incoming Webhook (`type: 1`). No probe message was
  posted.
- That read-only route returned `X-RateLimit-Limit: 5`,
  `X-RateLimit-Remaining: 4`, and `X-RateLimit-Reset-After: 1`. This confirms
  the credential and illustrates Discord's live bucket headers, but does not
  establish a fixed limit for Execute Webhook `POST`; the transport continues
  to use the `POST` response headers it actually receives.
- The current V2 requested cadence is 200 ms during a realized sharp move and
  five seconds in a nearly stationary active market. The network cadence may
  be slower only when Discord's live `POST` bucket requires it.
- The Korean stream uses `오늘 +n.nn%` rather than `일중`; all text remains
  parameterized from actual C-VAL executions.

## Retained invariants

- The V2 continuous double auction remains execution-driven.
- Phone motion remains the only participant market input.
- Discord has no feedback path into C-VAL.
- C-VAL 1 and existing C-VAL V2 screen contracts remain untouched.
- Future C-VAL versions can reuse the transport while supplying their own interpreter.
