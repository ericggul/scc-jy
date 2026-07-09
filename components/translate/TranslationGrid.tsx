"use client";

import { useMemo, useState } from "react";

export type GridLanguage = {
  id: string;
  dir?: "ltr" | "rtl";
};

export type GridConversation = {
  id: string;
};

type TranslationGridProps<
  Language extends GridLanguage,
  Conversation extends GridConversation,
> = {
  languages: readonly Language[];
  conversations: readonly Conversation[];
  matrix: readonly (readonly string[])[];
  cellHeight?: number;
  cellWidth?: number;
};

function getCellKey(row: number, column: number) {
  return `${row}:${column}`;
}

function getCellAxes(cellKey: string) {
  const [row, column] = cellKey.split(":").map(Number);
  return { row, column };
}

export default function TranslationGrid<
  Language extends GridLanguage,
  Conversation extends GridConversation,
>({
  languages,
  conversations,
  matrix,
  cellHeight = 128,
  cellWidth = 460,
}: TranslationGridProps<Language, Conversation>) {
  const [selectedCells, setSelectedCells] = useState(() => new Set<string>());
  const selectedAxes = useMemo(
    () => [...selectedCells].map(getCellAxes),
    [selectedCells],
  );
  const tableWidth = languages.length * cellWidth;

  return (
    <main className="h-dvh w-dvw overflow-scroll bg-[#f7f7f4] text-black">
      <table
        className="table-fixed border-collapse"
        style={{ width: tableWidth }}
      >
        <tbody>
          {conversations.map((conversation, rowIndex) => (
            <tr key={conversation.id}>
              {languages.map((language, columnIndex) => {
                const cellKey = getCellKey(rowIndex, columnIndex);
                const selectionCount = selectedAxes.reduce(
                  (count, selected) =>
                    count +
                    (selected.row === rowIndex ? 1 : 0) +
                    (selected.column === columnIndex ? 1 : 0),
                  0,
                );
                const isVisible = selectionCount % 2 === 1;

                return (
                  <td
                    key={`${conversation.id}-${language.id}`}
                    className="cursor-crosshair border border-black bg-[#f7f7f4] px-3 align-middle text-[clamp(17px,2.2vw,34px)] font-semibold leading-[1.08] outline-none hover:bg-white focus-visible:bg-white"
                    dir={language.dir}
                    lang={language.id}
                    onClick={() => {
                      setSelectedCells((current) => {
                        const next = new Set(current);

                        if (next.has(cellKey)) {
                          next.delete(cellKey);
                        } else {
                          next.add(cellKey);
                        }

                        return next;
                      });
                    }}
                    style={{ height: cellHeight, width: cellWidth }}
                    tabIndex={0}
                  >
                    <span className={isVisible ? "opacity-100" : "opacity-0"}>
                      {matrix[rowIndex]?.[columnIndex] ?? ""}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
