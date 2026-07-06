import { news, sectors, symbols } from "../data";
import {
  AreaChart,
  ChangeText,
  IndexTape,
  SessionLine,
  Sparkline,
  StockTopbar,
  signed,
  signedPercent,
} from "../primitives";

export default function StockOne() {
  const focus = symbols[0];

  return (
    <main className="min-h-screen bg-[#050607] text-[#d7fbe8]">
      <StockTopbar current="1" />
      <section className="grid border-b border-[#d7fbe8]/20 lg:grid-cols-[1.55fr_0.85fr]">
        <div className="border-b border-[#d7fbe8]/20 p-4 md:p-6 lg:border-b-0 lg:border-r">
          <SessionLine className="mb-8 text-[#7ce7ff]" />
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#ffcc66]">
                Primary tape
              </p>
              <h1 className="mt-3 text-6xl font-black leading-none text-white md:text-8xl">
                {focus.symbol}
              </h1>
              <p className="mt-2 text-xl text-[#d7fbe8]/70">{focus.name}</p>
            </div>
            <div className="font-mono text-right">
              <p className="text-5xl font-semibold text-white">{focus.price.toFixed(2)}</p>
              <p className="mt-2 text-2xl text-emerald-300">
                {signed(focus.change)} / {signedPercent(focus.changePercent)}
              </p>
            </div>
          </div>
          <AreaChart
            symbol={focus}
            className="mt-8 h-[330px] w-full text-[#5b6770]"
            lineClassName="text-[#7cffb2]"
            fillClassName="fill-[#7cffb2]/10"
          />
        </div>

        <aside className="grid content-start gap-px bg-[#d7fbe8]/20 p-px">
          {symbols.map((symbol) => (
            <article
              key={symbol.symbol}
              className="grid grid-cols-[1fr_100px] items-center gap-3 bg-[#050607] p-4"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <h2 className="font-mono text-2xl font-black text-white">
                    {symbol.symbol}
                  </h2>
                  <span className="text-sm text-[#d7fbe8]/55">{symbol.sector}</span>
                </div>
                <p className="mt-2 font-mono text-sm">
                  {symbol.price.toFixed(2)} <ChangeText value={symbol.changePercent} />
                </p>
              </div>
              <Sparkline
                series={symbol.series}
                positive={symbol.change >= 0}
                className="h-12 w-full"
              />
            </article>
          ))}
        </aside>
      </section>

      <section className="grid border-b border-[#d7fbe8]/20 xl:grid-cols-[1fr_0.65fr]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left font-mono">
            <thead>
              <tr className="border-b border-[#d7fbe8]/20 text-[11px] uppercase tracking-[0.16em] text-[#7ce7ff]">
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Last</th>
                <th className="px-4 py-3">Chg</th>
                <th className="px-4 py-3">Range</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Desk note</th>
              </tr>
            </thead>
            <tbody>
              {symbols.map((symbol) => (
                <tr key={symbol.symbol} className="border-b border-[#d7fbe8]/12 last:border-b-0">
                  <td className="px-4 py-4 text-2xl font-black text-white">{symbol.symbol}</td>
                  <td className="px-4 py-4">{symbol.price.toFixed(2)}</td>
                  <td className="px-4 py-4">
                    <ChangeText value={symbol.changePercent} />
                  </td>
                  <td className="px-4 py-4">
                    {symbol.dayRange[0].toFixed(2)} / {symbol.dayRange[1].toFixed(2)}
                  </td>
                  <td className="px-4 py-4">{symbol.volume}</td>
                  <td className="px-4 py-4 text-[#d7fbe8]/70">{symbol.sector}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#d7fbe8]/20 p-4 md:p-6 xl:border-l xl:border-t-0">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[#ffcc66]">
            Sector heat
          </h2>
          <div className="mt-5 grid gap-3">
            {sectors.map((sector) => (
              <div key={sector.name} className="grid grid-cols-[84px_1fr_74px] items-center gap-3 font-mono text-sm">
                <span>{sector.name}</span>
                <span className="h-2 bg-[#d7fbe8]/12">
                  <span
                    className={sector.change >= 0 ? "block h-full bg-emerald-400" : "block h-full bg-rose-400"}
                    style={{ width: `${sector.breadth}%` }}
                  />
                </span>
                <ChangeText value={sector.change} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-px bg-[#d7fbe8]/20 p-px md:grid-cols-4">
        {news.map((item) => (
          <article key={item.headline} className="min-h-40 bg-[#050607] p-4">
            <div className="mb-5 flex justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-[#7ce7ff]">
              <span>{item.time}</span>
              <span>{item.source}</span>
            </div>
            <h3 className="text-xl font-semibold leading-tight text-white">{item.headline}</h3>
          </article>
        ))}
      </section>
      <IndexTape className="border-t border-[#d7fbe8]/20 text-[#d7fbe8]" />
    </main>
  );
}

