# C-VAL external Slack publisher

> Date: 2026-08-10
> Relation: C-VAL V2's executed market state is projected into an artist-owned Slack channel as a one-second Korean research-report stream.

## Boundaries and files

```text
C-VAL V2 executions
  -> 50 ms execution snapshot
  -> socket/experiments/c-val/2/slack-publisher.mjs
  -> socket/experiments/c-val/external/slack.mjs
  -> Slack Incoming Webhook
```

`external/slack.mjs` is C-VAL-wide. It validates the Slack credential,
delivers Slack payloads, enforces the Slack channel cadence, coalesces stale
pending publications, and handles retries and terminal errors. It contains no
market or V2 wording.

`2/slack-publisher.mjs` is V2-specific. It reads the already execution-derived
snapshot after the normal 50 ms model step, decides when Slack may receive a
projection, and creates the text/Block Kit payload. It cannot affect the
market, phone input, V/A/L, socket state, or browser presentation.

`2/market-intensity.mjs` remains the narrow shared V2 calculation used by the
Discord interpreter. Slack's report interpreter reads the broader execution
snapshot, order book, recent orders, recent trades, and participant summaries;
neither transport imports the other's presenter.

The Discord and Slack adapters are parallel consumers. Either may be disabled
without changing the other one.

## Slack interpretation

Slack is not treated as a second Discord. An Incoming Webhook has one app name
and one selected destination channel; Slack does not allow that webhook to
override its display name or icon per message. The V2 adapter therefore uses a
single long-form research-desk voice rather than imitating many individual
accounts.

Each message contains:

- a 100–200어절 Korean report in one Slack `section` block;
- a plain-text fallback with the same report for notifications and clients that
  do not render Block Kit;
- a deterministic selection from 200 report frames, with the immediately prior
  frame excluded for the same run.

The separate `현재 … · 오늘 … · 개장 대비 …` context line is not sent. The report
instead uses actual server snapshot values: executed price and rolling range;
best bid/ask, spread, depth, imbalance, turnover, volatility, and price impact;
fundamental value and price/value gap; recent order and trade flow; and resting
orders held by the liquidity-provider, fundamental, trend, and noise agents
shown by the V2 controller.

The textual register is a Korean real-time research desk: compact sections on
execution, order book, participant layers, valuation gap, and the next
observation point. The report generator reads those values after executions
have been produced. It does not create orders, change participant behavior,
modify the book, or feed any report text back into C-VAL.

## Timing and rate limits

Slack documents a sustained limit of one app message per second per channel for
incoming webhooks. Short bursts can be accepted, but Slack does not guarantee
that they are stored or shown; continued excess is rate limited. The generic
transport consequently enforces a one-second minimum regardless of the V2
request and obeys `429 Retry-After` responses. [Slack rate limits](https://docs.slack.dev/apis/web-api/rate-limits/)

The report stream requests **one message every 1,000 ms in every active market
condition**. It does not slow to a quiet-market 2–5 second cadence. The generic
transport still takes precedence if Slack sends `429` or another recoverable
failure.

When Slack is behind, only the newest execution-based message remains queued.
It never backfills an obsolete sequence of market messages. `400`, `403`,
`404`, and `410` stop repeated requests from the process and discard an
already queued successor; recoverable network and server failures back off
exponentially.

## Configuration required later

Nothing is sent until both variables are set in the repository-root ignored
`.env` file:

```text
C_VAL_SLACK=true
C_VAL_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/<workspace>/<app>/<secret>
```

Do not add either value to a `NEXT_PUBLIC_*` variable or commit the webhook URL.
The socket relay, rather than the browser, loads `.env`.

### Slack-side setup

1. Create a Slack app in the intended workspace.
2. Enable **Incoming Webhooks** for the app.
3. Choose **Add New Webhook to Workspace**, select the intended C-VAL channel,
   and authorize it.
4. Copy the generated webhook URL into `C_VAL_SLACK_WEBHOOK_URL`; set
   `C_VAL_SLACK=true`.
5. Restart the existing socket server so it loads the new environment and code.

Slack's own setup flow binds the generated URL to the selected channel. If
later work requires threads, reading replies, deletion, or a bot identity with
additional permissions, use a full Slack app/OAuth flow rather than extending
this one-way webhook credential. [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)

## Verification coverage

- Missing or malformed environment variables make no network request.
- Text fallback and Block Kit payloads are sent together.
- Unicode content is bounded without splitting emoji.
- The channel-level one-second floor and `429 Retry-After` behavior are tested.
- A terminal webhook response disables the transport before an in-flight queue
  successor can be sent.
- V2 presenter tests prove the report uses execution and agent snapshot state,
  keeps every generated report in the 100–200어절 range, owns 200 distinct
  report frames, and stays separate from Discord's faster cadence.
