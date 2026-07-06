import * as simpleIcons from "simple-icons";
import type { SimpleIcon } from "simple-icons";
import { luxuryLogos, type LogoCell } from "./data";

const icons = simpleIcons as Record<string, SimpleIcon | undefined>;

function chunk<T>(items: readonly T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );
}

function LogoSvg({ logo }: { logo: LogoCell }) {
  const icon = logo.iconKey ? icons[logo.iconKey] : undefined;
  const viewBox = logo.custom?.viewBox ?? "0 0 24 24";
  const path = logo.custom?.path ?? icon?.path;

  if (!path) {
    return null;
  }

  return (
    <svg
      aria-labelledby={`logo-${logo.name.replace(/[^a-z0-9]/gi, "-")}`}
      className="h-[62%] w-[62%]"
      role="img"
      viewBox={viewBox}
    >
      <title id={`logo-${logo.name.replace(/[^a-z0-9]/gi, "-")}`}>
        {logo.name}
      </title>
      <path d={path} fill="currentColor" />
    </svg>
  );
}

export default function TableOne() {
  const rows = chunk(luxuryLogos, 10);

  return (
    <main className="h-dvh overflow-hidden bg-white text-black">
      <table className="h-full w-full table-fixed border-collapse">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((logo) => (
                <td
                  key={logo.name}
                  className="h-[10dvh] border border-black p-[clamp(4px,0.8vw,12px)]"
                >
                  <div className="flex h-full w-full items-center justify-center">
                    <LogoSvg logo={logo} />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
