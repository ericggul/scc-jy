# C-VAL external Telegram publisher

> Date: 2026-08-10  
> Relation: C-VAL V2's executed market state is projected into an artist-owned Telegram channel as a compact, silent channel bulletin stream.

## Boundaries and files

```text
C-VAL V2 executions
  -> 50 ms execution snapshot
  -> apps/c-val/socket/experiments/2/telegram-publisher.mjs
  -> apps/c-val/socket/experiments/external/telegram.mjs
  -> Telegram Bot API sendMessage
  -> artist-owned Telegram channel
```

`external/telegram.mjs` is C-VAL-wide. It validates the bot token and channel
destination, sends Bot API requests, enforces one-chat delivery pacing,
coalesces stale pending publications, and handles rate limits and terminal
errors. It contains no V2 market wording.

`2/telegram-publisher.mjs` is V2-specific. It receives an already
execution-derived snapshot after the normal 50 ms model step, chooses a Telegram
cadence, and renders one channel-bulletin message. It has no feedback path into
the market, phone input, V/A/L, socket state, or browser presentation.

Discord, Slack, and Telegram are parallel, independently enabled consumers.
Turning one off has no effect on the others or on the C-VAL market.

## Telegram interpretation

Telegram is a channel broadcast, not Discord's many webhook personas or Slack's
single desk app. The bot is made a channel administrator and posts in the
channel's voice. Messages are deliberately short, for example:

```text
🟢 114.27 통과
↔️ 방향 전환 · 114.27 → 112.91
체결 메모 · 112.91
```

Each number comes from the actual executed snapshot: current price, prior
published execution price, or the actual rolling execution range. The separate
`현재 … · 오늘 … · 개장 대비 …` summary line is not sent. Telegram HTML is
used only for compact emphasis; no custom emoji, invented participant action,
or fabricated market data is introduced.

Automatic messages use Telegram's `disable_notification` setting. They appear
in the channel without sending a push alert for every 1–2 second update.

## Timing, rate limits, and recovery

Telegram says to avoid sending more than one message per second in a single
chat; sustained excess eventually receives `429` errors. Its broader
bot-to-many-users broadcast limit is not a license to post more quickly into
one C-VAL channel. [Telegram Bots FAQ](https://core.telegram.org/bots/faq)

The generic transport consequently keeps a hard one-second floor, honors Bot
API `parameters.retry_after`, and keeps only the most recent execution update
when delivery is behind.

| Realized execution intensity | Requested Telegram message |
| ---: | ---: |
| below `0.15%` | 2,000 ms |
| `0.15%`–`0.50%` | 1,500 ms |
| `0.50%` or above | 1,000 ms |

`400`, `401`, `403`, and `404` terminal API responses disable the transport
for the process and discard any queued successor. Recoverable network and
server failures back off exponentially. Telegram credentials and endpoint URLs
are never written to logs.

## First-time Telegram setup

Use a **public channel** for the first setup. A public channel has an `@name`,
so there is no need to discover a numeric chat ID.

### 1. Create a Telegram account

1. Install Telegram on your phone or desktop and create an account with your
   phone number.
2. Complete Telegram's sign-in code flow.
3. You do not need to make a personal public profile or add contacts for this
   C-VAL setup.

### 2. Create the C-VAL channel

1. In Telegram, choose **New Channel**. Do not choose **New Group**.
2. Give it a title, for example `C-VAL`.
3. Select **Public Channel**.
4. Pick an available channel link such as `c_val_observer`. Telegram will show
   the resulting address as `t.me/c_val_observer`.
5. Record the channel identifier as `@c_val_observer`; that exact `@…` value is
   the future `C_VAL_TELEGRAM_CHANNEL_ID`.

The Bot API accepts a channel username in `@channelusername` form as the
`chat_id`. [Telegram Bot API: sendMessage](https://core.telegram.org/bots/api#sendmessage)

### 3. Create the posting bot

1. Search Telegram for the verified official account **@BotFather** and open
   it.
2. Send `/newbot`.
3. Give the bot a display name, for example `C-VAL Feed`.
4. Give it a username ending in `bot`, for example `c_val_observer_bot`.
5. BotFather returns a token in the form `digits:letters-and-symbols`. Copy it
   once into a password manager or directly into the ignored `.env` file.

The bot token controls the bot completely; do not post it in chat, source code,
or a screenshot. Telegram's own bot guide identifies @BotFather as the bot
registration path and gives the same token warning. [Telegram bot introduction](https://core.telegram.org/bots)

### 4. Give the bot only posting authority

1. Open the C-VAL channel.
2. Open its channel information → **Administrators** → **Add Admin**.
3. Find `@c_val_observer_bot` and add it.
4. Enable **Post Messages**. Leave unrelated administrator rights disabled
   unless there is a separate reason to grant them.

A bot needs channel administrator posting permission to write there. [Telegram
Bot API administrator rights](https://core.telegram.org/bots/api#promotechatmember)

### 5. Add the three values to this repository's ignored `.env`

```text
C_VAL_TELEGRAM=true
C_VAL_TELEGRAM_BOT_TOKEN=the_token_from_BotFather
C_VAL_TELEGRAM_CHANNEL_ID=@c_val_observer
```

Do not prefix these with `NEXT_PUBLIC_`, and do not commit `.env`. The socket
relay reads them; no browser client receives the bot token.

### 6. Reload the socket process

After saving `.env`, restart the already-running socket server so it picks up
the new credential and code. No message is sent simply because the server
starts: a C-VAL V2 client must be connected and the market must enter `active`
through its normal phone interaction before the publisher observes executions.

### If a token leaks

Use BotFather's `/revoke` command for that bot, replace the old token in `.env`,
and restart the socket server. Never try to repair a leaked token by leaving it
active.

## Verification coverage

- Missing, malformed, or disabled Telegram configuration makes no network
  request.
- The Bot API request has the configured channel ID, HTML payload, disabled
  link preview, and silent-notification setting.
- Unicode is bounded without splitting emoji.
- The one-second single-chat floor and Bot API `retry_after` response are
  tested.
- A terminal credential or channel response disables the transport before an
  in-flight queue successor can be sent.
- V2 presentation tests prove displayed values come from executed market state,
  that Telegram's tone is independent of Discord and Slack, and that cadence
  remains within Telegram's per-chat limit.
