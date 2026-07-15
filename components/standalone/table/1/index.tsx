"use client";

import { useState } from "react";
import { brandLogos, logoTableSize, type LogoCell } from "./data";

function chunk<T>(items: readonly T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );
}

function LogoSvg({
  logo,
  monochrome,
}: {
  logo: LogoCell;
  monochrome: boolean;
}) {
  return (
    <svg
      aria-labelledby={`logo-${logo.id}`}
      className="h-[68%] w-[68%]"
      role="img"
      viewBox="0 0 24 24"
    >
      <title id={`logo-${logo.id}`}>{logo.name}</title>
      <path d={logo.path} fill={monochrome ? "currentColor" : `#${logo.hex}`} />
    </svg>
  );
}

export default function TableOne() {
  const [monochrome, setMonochrome] = useState(false);
  const rows = chunk(brandLogos, logoTableSize.columns);

  return (
    <main className="h-dvh overflow-hidden bg-white text-black">
      <table className="h-full w-full table-fixed border-collapse">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((logo) => (
                <td
                  key={logo.id}
                  className="h-[2dvh] p-[clamp(1px,0.12vw,3px)]"
                >
                  <div
                    className="flex h-full w-full items-center justify-center"
                    title={`${logo.name} - ${logo.source}`}
                  >
                    <LogoSvg logo={logo} monochrome={monochrome} />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <label className="fixed bottom-3 left-3 z-10 flex h-9 items-center gap-2 bg-white px-2 text-[11px] font-black uppercase text-black mix-blend-normal">
        <input
          checked={monochrome}
          className="h-4 w-4 accent-black"
          onChange={(event) => setMonochrome(event.target.checked)}
          type="checkbox"
        />
        monochrome
      </label>
    </main>
  );
}
