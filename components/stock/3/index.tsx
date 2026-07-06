import { indices, riskMetrics, sectors, symbols } from "../data";
import { AreaChart, ChangeText, SessionLine, StockTopbar } from "../primitives";

export default function StockThree() {
  const focus = symbols[2];

  return (
    <main className="min-h-screen bg-[#090b10] text-[#eef3f8]">
      <StockTopbar current="3" />
      <section className="grid min-h-[calc(100vh-49px)] lg:grid-cols-[72px_1fr_360px]">
        <aside className="hidden border-r border-white/10 lg:grid">
          {indices.map((index) => (
            <div
              key={index.label}
              className="flex items-center justify-center border-b border-white/10 [writing-mode:vertical-rl]"
            >
              <span className="font-mono text-xs uppercase tracking-[0.22em] text-white/55">
                {index.label} {index.value}
              </span>
            </div>
          ))}
        </aside>

        <section className="grid grid-rows-[auto_1fr_auto]">
          <div className="border-b border-white/10 p-5 md:p-7">
            <SessionLine className="text-[#8fb8ff]" />
            <div className="mt-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/45">
                  Institutional graph wall
                </p>
                <h1 className="mt-3 text-6xl font-black leading-none md:text-9xl">
                  {focus.symbol}
                </h1>
              </div>
              <div className="md:text-right">
                <p className="text-5xl font-semibold">{focus.price.toFixed(2)}</p>
                <p className="mt-2 text-2xl">
                  <ChangeText value={focus.changePercent} />
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden border-b border-white/10 p-4 md:p-7">
            <div className="absolute inset-y-0 left-1/2 w-px bg-[#8fb8ff]/20" />
            <AreaChart
              symbol={focus}
              className="h-[52vh] min-h-[360px] w-full text-white/35"
              lineClassName="text-[#8fb8ff]"
              fillClassName="fill-[#8fb8ff]/12"
            />
          </div>

          <div className="grid border-b border-white/10 md:grid-cols-4 lg:border-b-0">
            {riskMetrics.map((metric) => (
              <div key={metric.label} className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-white/42">
                  {metric.label}
                </p>
                <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-sm text-[#8fb8ff]">{metric.change}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="grid content-start border-white/10 lg:border-l">
          <div className="border-b border-white/10 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/45">
              Breadth matrix
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {sectors.map((sector) => (
                <div
                  key={sector.name}
                  className="border border-white/10 p-3"
                  style={{ backgroundColor: sector.change >= 0 ? "rgba(20,184,166,0.12)" : "rgba(244,63,94,0.12)" }}
                >
                  <p className="text-sm text-white/55">{sector.name}</p>
                  <p className="mt-4 text-3xl font-semibold">
                    <ChangeText value={sector.change} />
                  </p>
                  <p className="mt-1 font-mono text-xs text-white/40">{sector.flows}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-px bg-white/10 p-px">
            {symbols.map((symbol) => (
              <article key={symbol.symbol} className="grid grid-cols-[1fr_auto] bg-[#090b10] p-4">
                <div>
                  <h2 className="text-2xl font-semibold">{symbol.symbol}</h2>
                  <p className="text-sm text-white/45">{symbol.name}</p>
                </div>
                <div className="text-right">
                  <p>{symbol.price.toFixed(2)}</p>
                  <ChangeText value={symbol.changePercent} />
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

