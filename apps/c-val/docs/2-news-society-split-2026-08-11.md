# C-VAL 2 independent society-news thread — 2026-08-11

> Route: `/c-val/2/screen/news`  
> Changed variable: the semantic ownership and accumulation of the right column  
> Former preserved baseline: `components/c-val/2/screen/news-legacy/` (removed
> after it became unused). The active implementation is `screen/news/`.

## Trial contract

The left column remains the existing market/finance news presenter. The right
column is no longer the older half of one 54-record archive: it is an independent
society/politics thread. Each side admits, deduplicates, schedules, numbers, and
retains its own 27 newest-first records. The left thread keeps the exact existing
movement-sensitive timing. The right thread uses the same price-sensitive base
interval with a newly sampled ±22% multiplier after every admitted story, plus
a deferred first admission. Its expected multiplier is 1.0, so the long-run
speed remains comparable while simultaneous row insertion is no longer the
default. Neither queue can consume, delay, or evict the other.

The frame, palette, type scale, two-column geometry, row height, metadata
columns, truncation, borders, and movement readout remain invariant. The only
visible labels changed are those needed to identify the two editorial desks.

## Society headline grammar

The society presenter classifies actual C-VAL state into ten regimes: surge,
rise, uptick, rebound, flat, contest, pullback, downtick, slide, and crash. A
headline is admitted only when one of four material state boundaries changes:
the regime, change-from-open bucket, order-flow band, or liquidity bucket.

Eighteen topic families cover party politics and approval framing, labor and
bonuses, social dividend and welfare, housing, education, mental health,
consumption and food sales, small business, employment, generations, regions,
online media and nationalist framing, CEO culture, household debt, safety nets,
and culture/leisure. Topic-specific subject/consequence pairs provide fixed
headlines, while three contextual frames can place a regime phrase before,
after, or inside the same editorial construction. Together they expose 55,350
distinct forms and a 107-keyword pool. The selector avoids visible and queued
template IDs, so diversity is structural rather than a random stream of
disconnected text.

## Evidence and claim boundary

The grammar was informed by the language and issue structure of 2026 Korean
reporting and public material: party-support interpretation, semiconductor
compensation and labor questions, housing and household-debt policy, education
cost and opportunity gaps, working-time reform, consumption spillovers, and
social-safety debates. This is a writing reference, not an external live-news
feed.

The screen never invents a newspaper, reporter, timestamp, poll result, sales
count, suicide-rate value, or causal social statistic. Sensitive themes are
phrased as debate, concern, support demand, or a warning against simplistic
causal interpretation. The only displayed number remains the real C-VAL market
movement attached to the triggering snapshot.

Writing references consulted for issue coverage and contemporary vocabulary:

- Statistics Research Institute, [Korean Social Trends 2025](https://sri.kostat.go.kr/board.es?act=view&bid=11477&list_no=442588&mainXml=Y&mid=a90401000000)
- Korea Exchange, [2026 market notices and index context](https://www.krx.co.kr/main/mobile.jsp)
- Ministry of Employment and Labor, [working-time guidance](https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19208) and [4.5-day-week support](https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19545)
- Ministry of Land, Infrastructure and Transport, [2026 housing and real-estate policy](https://www.molit.go.kr/2026plan/sub3_realestate.html)
- Ministry of Education, [low-income education support](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=105459&lev=0&m=020402)
- Contemporary reporting on [party-support interpretation](https://www.hankyung.com/article/2026060840591) and [semiconductor compensation and job preference](https://zdnet.co.kr/view/?no=20260609153304)

## Verification and unresolved question

Static verification covers the 2,000-form minimum, regime classification,
transition-derived event admission, duplicate-template exclusion, TypeScript,
lint, and whitespace integrity. Runtime/browser acceptance remains deliberately
pending because it was not requested. The next observation should ask whether
the independent right-hand cadence reads as a parallel social consequence
desk—rather than as a mechanically translated shadow of the market desk—during
long flat, reversal-heavy, and extreme runs.
