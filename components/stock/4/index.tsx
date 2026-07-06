import { news, optionsFlow, sectors, symbols } from "../data";
import { AreaChart, ChangeText, SessionLine, StockTopbar } from "../primitives";

export default function StockFour() {
  const focus = symbols[3];

  return (
    <main className="min-h-screen bg-[#07100f] text-[#eafff8]">
      <StockTopbar current="4" />
      <section className="grid border-b border-[#53ffd6]/20 xl:grid-cols-[340px_1fr_360px]">
        <aside className="border-b border-[#53ffd6]/20 p-4 md:p-6 xl:border-b-0 xl:border-r">
          <SessionLine className="text-[#53ffd6]" />
          <h1 className="mt-10 text-5xl font-black leading-none md:text-7xl">
            Flow tape
          </h1>
          <p className="mt-4 max-w-sm text-lg leading-7 text-[#eafff8]/65">
            Live derivatives pressure, liquidity pockets, and single-name momentum.
          </p>
          <div className="mt-8 grid gap-3">
            {optionsFlow.map((flow) => (
              <article
                key={`${flow.time}-${flow.symbol}`}
                className="border border-[#53ffd6]/18 bg-[#0d1a18] p-3"
              >
                <div className="flex items-center justify-between font-mono text-xs text-[#53ffd6]">
                  <span>{flow.time}</span>
                  <span>{flow.expiry}</span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-3xl font-black">{flow.symbol}</h2>
                    <p className="text-sm text-[#eafff8]/55">
                      {flow.side} / {flow.strike}
                    </p>
                  </div>
                  <p className={flow.tone === "bullish" ? "text-emerald-300" : "text-rose-300"}>
                    {flow.premium}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </aside>

        <section className="p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#53ffd6]">
                Volatility target
              </p>
              <h2 className="mt-3 text-7xl font-black leading-none md:text-9xl">
                {focus.symbol}
              </h2>
            </div>
            <div className="md:text-right">
              <p className="text-5xl font-semibold">{focus.price.toFixed(2)}</p>
              <p className="mt-2 text-2xl">
                <ChangeText value={focus.changePercent} />
              </p>
            </div>
          </div>
          <AreaChart
            symbol={focus}
            className="mt-8 h-[440px] w-full text-[#53ffd6]/30"
            lineClassName="text-[#ff5d8f]"
            fillClassName="fill-[#ff5d8f]/12"
          />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {["Gamma wall 320", "Dealer short vol", "Put skew +4.1"].map((label) => (
              <div key={label} className="border border-[#53ffd6]/18 bg-[#0d1a18] p-4">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#53ffd6]">
                  {label}
                </p>
                <p className="mt-6 text-3xl font-semibold">{focus.volume}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="border-t border-[#53ffd6]/20 p-4 md:p-6 xl:border-l xl:border-t-0">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#53ffd6]">
            Liquidity lanes
          </p>
          <div className="mt-5 grid gap-2">
            {sectors.map((sector) => (
              <div key={sector.name} className="grid grid-cols-[72px_1fr_58px] items-center gap-3 text-sm">
                <span className="text-[#eafff8]/65">{sector.name}</span>
                <span className="relative h-8 overflow-hidden bg-[#0d1a18]">
                  <span
                    className={sector.change >= 0 ? "absolute inset-y-0 left-0 bg-[#53ffd6]/50" : "absolute inset-y-0 right-0 bg-[#ff5d8f]/55"}
                    style={{ width: `${sector.breadth}%` }}
                  />
                </span>
                <ChangeText value={sector.change} />
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-px bg-[#53ffd6]/16 p-px">
            {news.map((item) => (
              <article key={item.headline} className="bg-[#07100f] p-4">
                <p className="mb-2 font-mono text-xs text-[#53ffd6]">
                  {item.time} / {item.impact}
                </p>
                <h3 className="leading-tight">{item.headline}</h3>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

