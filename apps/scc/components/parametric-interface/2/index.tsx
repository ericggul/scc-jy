"use client";

import { lyricWordTimings } from "../model/lyrics";
import { useLyricCue } from "../timeline/use-lyric-cue";
import { getOfficeRowsForWord } from "./model/workbook";
import styles from "./lyric-sheet.module.css";

const columns = Array.from({ length: 16 }, (_, position) => ({
  id: `column-${position + 1}`,
  label: String.fromCharCode(65 + position),
  position,
}));
const rows = Array.from({ length: 25 }, (_, position) => ({
  id: `row-${position + 1}`,
  label: position + 1,
  position,
}));
const centreRowPosition = Math.floor(rows.length / 2);

export default function ParametricInterfaceTwo() {
  const { cycleIndex, lyric, wordIndex } = useLyricCue();
  const activeWord = lyricWordTimings[wordIndex]!;
  const lyricTick = cycleIndex * lyricWordTimings.length + wordIndex;
  const officeRows = getOfficeRowsForWord(lyricTick);
  const lyricWords = lyric.join(" ").split(" ").map((word) => word.toUpperCase());
  const lyricStartColumn = Math.floor((columns.length - lyricWords.length) / 2);
  const activeWordPosition = lyricWordTimings
    .slice(0, wordIndex)
    .filter((word) => word.cueIndex === activeWord.cueIndex).length;
  const activeColumnPosition = lyricStartColumn + activeWordPosition;

  return (
    <main className={styles.page}>
      <section aria-label="Lyric spreadsheet" className={styles.workbook}>
        <div className={styles.sheetViewport}>
          <table aria-label="Lyric cells" className={styles.sheet}>
            <colgroup>
              <col className={styles.rowHeaderColumn} />
              {columns.map((column) => <col key={column.id} />)}
            </colgroup>
            <thead>
              <tr>
                <th aria-label="Row number" className={styles.corner} scope="col" />
                {columns.map((column) => (
                  <th
                    className={column.position === activeColumnPosition ? styles.activeHeader : undefined}
                    key={column.id}
                    scope="col"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th
                    className={row.position === centreRowPosition ? styles.activeHeader : undefined}
                    scope="row"
                  >
                    {row.label}
                  </th>
                  {columns.map((column) => {
                    const lyricWord = row.position === centreRowPosition
                      ? lyricWords[column.position - lyricStartColumn]
                      : undefined;
                    const officeValue = officeRows[row.position]?.[column.position];
                    const isActive =
                      row.position === centreRowPosition &&
                      column.position === activeColumnPosition;
                    const cellClassName = [
                      row.position === 0 ? styles.dataHeader : undefined,
                      lyricWord ? styles.lyricCell : undefined,
                      isActive ? styles.activeCell : undefined,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <td className={cellClassName || undefined} key={column.id}>
                        {lyricWord ?? officeValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className={styles.sheetTabs}>
          <span aria-hidden="true" className={styles.addSheet}>+</span>
          <span aria-hidden="true" className={styles.allSheets}>≡</span>
          <span className={styles.activeTab}>Sheet 1</span>
        </footer>
      </section>
    </main>
  );
}
