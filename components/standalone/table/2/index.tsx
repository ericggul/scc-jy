"use client";

import { useState, type CSSProperties } from "react";
import { brandLogos, logoTableSize, type LogoCell } from "../1/data";

const initialIconScale = 3;

function chunk<T>(items: readonly T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
}

function LogoSvg({ logo, monochrome }: { logo: LogoCell; monochrome: boolean }) {
  return (
    <svg
      aria-labelledby={`table-2-logo-${logo.id}`}
      className="pointer-events-none absolute left-1/2 top-1/2 h-[calc(68%*var(--icon-scale))] w-[calc(68%*var(--icon-scale))] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
      role="img"
      viewBox="0 0 24 24"
    >
      <title id={`table-2-logo-${logo.id}`}>{logo.name}</title>
      <path d={logo.path} fill={monochrome ? "currentColor" : `#${logo.hex}`} />
    </svg>
  );
}

export default function TableTwo() {
  const [iconScale, setIconScale] = useState(initialIconScale);
  const [monochrome, setMonochrome] = useState(false);
  const rows = chunk(brandLogos, logoTableSize.columns);

  return (
    <main className="h-dvh overflow-hidden bg-black text-white" style={{ "--icon-scale": iconScale } as CSSProperties}>
      <table className="h-full w-full table-fixed border-collapse overflow-visible">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((logo) => (
                <td key={logo.id} className="h-[2dvh] overflow-visible p-0">
                  <div className="relative h-full w-full overflow-visible" title={`${logo.name} - ${logo.source}`}>
                    <LogoSvg logo={logo} monochrome={monochrome} />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="fixed bottom-3 left-3 z-10 flex h-9 items-center gap-2 bg-white px-2 text-black mix-blend-normal">
        <span className="w-7 text-[11px] font-black tabular-nums">{iconScale.toFixed(1)}</span>
        <input aria-label="icon scale" className="h-5 w-36 accent-black" max="5" min="1" onChange={(event) => setIconScale(Number(event.target.value))} step="0.1" type="range" value={iconScale} />
        <label className="flex items-center gap-1 text-[11px] font-black uppercase">
          <input checked={monochrome} className="h-4 w-4 accent-black" onChange={(event) => setMonochrome(event.target.checked)} type="checkbox" />
          monochrome
        </label>
      </div>
    </main>
  );
}
