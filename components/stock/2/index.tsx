import { news, symbols } from "../data";
import { ChangeText, Sparkline, StockTopbar, signed, signedPercent } from "../primitives";

export default function StockTwo() {
  const hero = symbols[1];
  const watchlist = symbols.filter((symbol) => symbol.symbol !== hero.symbol);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#111318]">
      <StockTopbar current="2" />
      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 md:grid-cols-[0.82fr_1.18fr] md:px-6 md:py-8">
        <aside className="grid content-start gap-3">
          <div className="rounded-[8px] border border-black/8 bg-white p-4 shadow-[0_18px_60px_rgba(34,42,62,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-black/50">Watchlist</p>
                <h1 className="mt-1 text-4xl font-semibold leading-tight">Today</h1>
              </div>
              <p className="rounded-[8px] bg-[#10131a] px-3 py-2 text-sm text-white">
                Open
              </p>
            </div>
            <div className="mt-5 grid gap-2">
              {watchlist.map((symbol) => (
                <article
                  key={symbol.symbol}
                  className="grid grid-cols-[1fr_80px_72px] items-center gap-3 rounded-[8px] border border-black/6 bg-[#f8fafc] p-3"
                >
                  <div>
                    <h2 className="text-lg font-semibold">{symbol.symbol}</h2>
                    <p className="text-xs text-black/45">{symbol.name}</p>
                  </div>
                  <Sparkline
                    series={symbol.series}
                    positive={symbol.change >= 0}
                    className="h-9 w-full"
                    strokeWidth={3}
                  />
                  <div className="text-right text-sm">
                    <p className="font-semibold">{symbol.price.toFixed(2)}</p>
                    <ChangeText value={symbol.changePercent} />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[8px] border border-black/8 bg-[#111318] p-4 text-white">
            <p className="text-sm text-white/55">Market stories</p>
            <div className="mt-4 grid gap-4">
              {news.slice(0, 3).map((item) => (
                <article key={item.headline} className="border-t border-white/10 pt-4">
                  <p className="mb-2 text-xs text-white/45">
                    {item.time} / {item.source}
                  </p>
                  <h3 className="leading-tight">{item.headline}</h3>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <section className="grid gap-4">
          <article className="overflow-hidden rounded-[8px] border border-black/8 bg-white shadow-[0_22px_80px_rgba(34,42,62,0.10)]">
            <div className="p-5 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-black/50">{hero.name}</p>
                  <h2 className="mt-1 text-6xl font-semibold leading-none md:text-8xl">
                    {hero.symbol}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-semibold">{hero.price.toFixed(2)}</p>
                  <p className="mt-1 text-xl text-emerald-500">
                    {signed(hero.change)} ({signedPercent(hero.changePercent)})
                  </p>
                </div>
              </div>
              <Sparkline
                series={hero.series}
                className="mt-8 h-64 w-full"
                strokeWidth={4}
              />
            </div>
            <div className="grid border-t border-black/8 bg-[#f8fafc] md:grid-cols-3">
              <div className="border-b border-black/8 p-4 md:border-b-0 md:border-r">
                <p className="text-xs text-black/45">Day range</p>
                <p className="mt-1 text-2xl font-semibold">
                  {hero.dayRange[0].toFixed(0)}-{hero.dayRange[1].toFixed(0)}
                </p>
              </div>
              <div className="border-b border-black/8 p-4 md:border-b-0 md:border-r">
                <p className="text-xs text-black/45">Volume</p>
                <p className="mt-1 text-2xl font-semibold">{hero.volume}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-black/45">Sector</p>
                <p className="mt-1 text-2xl font-semibold">{hero.sector}</p>
              </div>
            </div>
          </article>

          <div className="grid gap-4 md:grid-cols-3">
            {symbols.slice(0, 3).map((symbol) => (
              <article key={symbol.symbol} className="rounded-[8px] border border-black/8 bg-white p-4">
                <p className="text-sm text-black/45">{symbol.name}</p>
                <div className="mt-6 flex items-end justify-between gap-2">
                  <span className="text-3xl font-semibold">{symbol.symbol}</span>
                  <ChangeText value={symbol.changePercent} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

