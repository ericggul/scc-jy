import { portfolio, riskMetrics, sectors, symbols } from "../data";
import { AreaChart, ChangeText, IndexTape, SessionLine, StockTopbar, signedPercent } from "../primitives";

export default function StockFive() {
  const focus = symbols[4];

  return (
    <main className="min-h-screen bg-[#f7f9fb] text-[#17202a]">
      <StockTopbar current="5" />
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid content-between gap-8 border border-[#17202a]/12 bg-white p-5 md:p-7">
          <div>
            <SessionLine className="text-[#5f6b78]" />
            <h1 className="mt-12 max-w-4xl text-6xl font-semibold leading-none md:text-8xl">
              Portfolio command brief
            </h1>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {riskMetrics.map((metric) => (
              <article key={metric.label} className="border-t border-[#17202a]/16 pt-4">
                <p className="text-sm text-[#5f6b78]">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-sm text-[#006fbf]">{metric.change}</p>
              </article>
            ))}
          </div>
        </div>

        <article className="border border-[#17202a]/12 bg-[#17202a] p-5 text-white md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/55">Risk anchor</p>
              <h2 className="mt-2 text-5xl font-semibold">{focus.symbol}</h2>
            </div>
            <div className="text-right">
              <p className="text-4xl font-semibold">{focus.price.toFixed(2)}</p>
              <p className="mt-1">{signedPercent(focus.changePercent)}</p>
            </div>
          </div>
          <AreaChart
            symbol={focus}
            className="mt-8 h-72 w-full text-white/25"
            lineClassName="text-[#7dd3fc]"
            fillClassName="fill-[#7dd3fc]/10"
          />
        </article>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-8 md:px-6 xl:grid-cols-[1fr_360px]">
        <div className="border border-[#17202a]/12 bg-white">
          <div className="grid border-b border-[#17202a]/12 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <h2 className="text-3xl font-semibold">Allocation</h2>
            <p className="text-sm text-[#5f6b78]">$30.4M gross exposure</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#17202a]/12 text-sm text-[#5f6b78]">
                  <th className="px-4 py-3 font-medium">Sleeve</th>
                  <th className="px-4 py-3 font-medium">Weight</th>
                  <th className="px-4 py-3 font-medium">P/L</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Exposure</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((item) => (
                  <tr key={item.sleeve} className="border-b border-[#17202a]/10 last:border-b-0">
                    <td className="px-4 py-4 text-xl font-semibold">{item.sleeve}</td>
                    <td className="px-4 py-4">
                      <span className="inline-grid w-40 grid-cols-[1fr_42px] items-center gap-3">
                        <span className="h-2 bg-[#d8dee6]">
                          <span className="block h-full bg-[#17202a]" style={{ width: `${item.weight}%` }} />
                        </span>
                        <span>{item.weight}%</span>
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <ChangeText value={item.pnl} />
                    </td>
                    <td className="px-4 py-4">{item.risk}</td>
                    <td className="px-4 py-4">{item.exposure}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="grid gap-6">
          <div className="border border-[#17202a]/12 bg-white p-4">
            <h2 className="text-2xl font-semibold">Sector stance</h2>
            <div className="mt-5 grid gap-3">
              {sectors.map((sector) => (
                <div key={sector.name} className="grid grid-cols-[80px_1fr_62px] items-center gap-3 text-sm">
                  <span>{sector.name}</span>
                  <span className="h-2 bg-[#d8dee6]">
                    <span
                      className={sector.change >= 0 ? "block h-full bg-[#00a676]" : "block h-full bg-[#d64550]"}
                      style={{ width: `${sector.breadth}%` }}
                    />
                  </span>
                  <ChangeText value={sector.change} />
                </div>
              ))}
            </div>
          </div>
          <div className="border border-[#17202a]/12 bg-white p-4">
            <h2 className="text-2xl font-semibold">Single-name book</h2>
            <div className="mt-4 grid gap-3">
              {symbols.slice(0, 4).map((symbol) => (
                <div key={symbol.symbol} className="flex items-center justify-between gap-4 border-t border-[#17202a]/10 pt-3">
                  <div>
                    <p className="font-semibold">{symbol.symbol}</p>
                    <p className="text-sm text-[#5f6b78]">{symbol.sector}</p>
                  </div>
                  <ChangeText value={symbol.changePercent} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
      <IndexTape className="mx-auto mb-8 w-full max-w-7xl border border-[#17202a]/12 bg-white text-[#17202a]" />
    </main>
  );
}

