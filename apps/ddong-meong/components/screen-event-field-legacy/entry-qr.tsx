"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  ddongMeongCampaignEntryContext,
  entryContextToQuery,
  type DdongMeongEntryContext,
} from "../model/entry-context";
import { ddongMeongEntryPath } from "../model/experiment-route";
import styles from "./entry-qr.module.css";

const version = 5;
const moduleCount = version * 4 + 17;
const dataCodewordCount = 108;
const errorCorrectionCodewordCount = 26;
const errorCorrectionLevelL = 1;
const exponentTable = Array<number>(512).fill(0);
const logarithmTable = Array<number>(256).fill(0);

{
  let value = 1;
  for (let index = 0; index < 255; index += 1) {
    exponentTable[index] = value;
    logarithmTable[value] = index;
    value <<= 1;
    if ((value & 0x100) !== 0) value ^= 0x11d;
  }
  for (let index = 255; index < exponentTable.length; index += 1) {
    exponentTable[index] = exponentTable[index - 255];
  }
}

type QrMatrix = boolean[][];

function gexp(value: number) {
  return exponentTable[value % 255];
}

function glog(value: number) {
  if (value < 1) throw new Error("QR logarithm requires a non-zero value.");
  return logarithmTable[value];
}

function polynomialMultiply(left: number[], right: number[]) {
  const result = Array<number>(left.length + right.length - 1).fill(0);
  left.forEach((leftValue, leftIndex) => {
    right.forEach((rightValue, rightIndex) => {
      result[leftIndex + rightIndex] ^=
        gexp(glog(leftValue) + glog(rightValue));
    });
  });
  return result;
}

function polynomialMod(dividend: number[], divisor: number[]) {
  const result = [...dividend];
  while (result.length >= divisor.length) {
    const ratio = glog(result[0]) - glog(divisor[0]);
    divisor.forEach((value, index) => {
      result[index] ^= gexp(glog(value) + ratio);
    });
    while (result[0] === 0) result.shift();
  }
  return result;
}

function errorCorrectionPolynomial(length: number) {
  let polynomial = [1];
  for (let index = 0; index < length; index += 1) {
    polynomial = polynomialMultiply(polynomial, [1, gexp(index)]);
  }
  return polynomial;
}

function getBchDigit(value: number) {
  let digit = 0;
  let current = value;
  while (current !== 0) {
    digit += 1;
    current >>>= 1;
  }
  return digit;
}

function getBchTypeInfo(value: number) {
  let current = value << 10;
  while (getBchDigit(current) >= getBchDigit(0x537)) {
    current ^= 0x537 << (getBchDigit(current) - getBchDigit(0x537));
  }
  return ((value << 10) | current) ^ 0x5412;
}

function maskApplies(maskPattern: number, row: number, column: number) {
  if (maskPattern === 0) return (row + column) % 2 === 0;
  if (maskPattern === 1) return row % 2 === 0;
  if (maskPattern === 2) return column % 3 === 0;
  if (maskPattern === 3) return (row + column) % 3 === 0;
  if (maskPattern === 4) {
    return (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0;
  }
  if (maskPattern === 5) return ((row * column) % 2) + ((row * column) % 3) === 0;
  if (maskPattern === 6) {
    return (((row * column) % 2) + ((row * column) % 3)) % 2 === 0;
  }
  return (((row * column) % 3) + ((row + column) % 2)) % 2 === 0;
}

function makeCodewords(value: string) {
  const bytes = Array.from(value, (character) => character.charCodeAt(0));
  if (bytes.length > 106) throw new Error("The QR value is too long.");

  const bits: boolean[] = [];
  const put = (number: number, length: number) => {
    for (let index = length - 1; index >= 0; index -= 1) {
      bits.push(((number >>> index) & 1) === 1);
    }
  };

  put(0b0100, 4);
  put(bytes.length, 8);
  bytes.forEach((byte) => put(byte, 8));
  put(0, Math.min(4, dataCodewordCount * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(false);

  const data = Array<number>(dataCodewordCount).fill(0);
  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index]) data[Math.floor(index / 8)] |= 1 << (7 - (index % 8));
  }
  for (
    let index = Math.ceil(bits.length / 8), padIndex = 0;
    index < data.length;
    index += 1, padIndex += 1
  ) {
    data[index] = padIndex % 2 === 0 ? 0xec : 0x11;
  }

  const divisor = errorCorrectionPolynomial(errorCorrectionCodewordCount);
  const remainder = polynomialMod(
    [...data, ...Array<number>(errorCorrectionCodewordCount).fill(0)],
    divisor,
  );
  const correction = [
    ...Array<number>(errorCorrectionCodewordCount - remainder.length).fill(0),
    ...remainder,
  ];
  return [...data, ...correction];
}

function emptyMatrix() {
  return Array.from({ length: moduleCount }, () =>
    Array<boolean | null>(moduleCount).fill(null),
  );
}

function setupFinder(matrix: Array<Array<boolean | null>>, row: number, column: number) {
  for (let rowOffset = -1; rowOffset <= 7; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 7; columnOffset += 1) {
      const targetRow = row + rowOffset;
      const targetColumn = column + columnOffset;
      if (
        targetRow < 0 ||
        targetRow >= moduleCount ||
        targetColumn < 0 ||
        targetColumn >= moduleCount
      ) {
        continue;
      }
      matrix[targetRow][targetColumn] =
        (rowOffset >= 0 && rowOffset <= 6 && (columnOffset === 0 || columnOffset === 6)) ||
        (columnOffset >= 0 && columnOffset <= 6 && (rowOffset === 0 || rowOffset === 6)) ||
        (rowOffset >= 2 && rowOffset <= 4 && columnOffset >= 2 && columnOffset <= 4);
    }
  }
}

function setupPatterns(matrix: Array<Array<boolean | null>>) {
  setupFinder(matrix, 0, 0);
  setupFinder(matrix, moduleCount - 7, 0);
  setupFinder(matrix, 0, moduleCount - 7);

  for (let index = 8; index < moduleCount - 8; index += 1) {
    if (matrix[index][6] === null) matrix[index][6] = index % 2 === 0;
    if (matrix[6][index] === null) matrix[6][index] = index % 2 === 0;
  }

  const alignmentPosition = 30;
  for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
    for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
      matrix[alignmentPosition + rowOffset][alignmentPosition + columnOffset] =
        rowOffset === -2 ||
        rowOffset === 2 ||
        columnOffset === -2 ||
        columnOffset === 2 ||
        (rowOffset === 0 && columnOffset === 0);
    }
  }
}

function setupTypeInfo(
  matrix: Array<Array<boolean | null>>,
  maskPattern: number,
  test: boolean,
) {
  const bits = getBchTypeInfo((errorCorrectionLevelL << 3) | maskPattern);
  for (let index = 0; index < 15; index += 1) {
    const bit = !test && ((bits >>> index) & 1) === 1;
    if (index < 6) matrix[index][8] = bit;
    else if (index < 8) matrix[index + 1][8] = bit;
    else matrix[moduleCount - 15 + index][8] = bit;

    if (index < 8) matrix[8][moduleCount - index - 1] = bit;
    else if (index < 9) matrix[8][15 - index] = bit;
    else matrix[8][15 - index - 1] = bit;
  }
  matrix[moduleCount - 8][8] = !test;
}

function mapCodewords(
  matrix: Array<Array<boolean | null>>,
  codewords: number[],
  maskPattern: number,
) {
  let increment = -1;
  let row = moduleCount - 1;
  let bitIndex = 7;
  let codewordIndex = 0;

  for (let column = moduleCount - 1; column > 0; column -= 2) {
    if (column === 6) column -= 1;
    while (true) {
      for (let columnOffset = 0; columnOffset < 2; columnOffset += 1) {
        const targetColumn = column - columnOffset;
        if (matrix[row][targetColumn] !== null) continue;

        let dark = false;
        if (codewordIndex < codewords.length) {
          dark = ((codewords[codewordIndex] >>> bitIndex) & 1) === 1;
        }
        if (maskApplies(maskPattern, row, targetColumn)) dark = !dark;
        matrix[row][targetColumn] = dark;
        bitIndex -= 1;
        if (bitIndex < 0) {
          codewordIndex += 1;
          bitIndex = 7;
        }
      }
      row += increment;
      if (row < 0 || row >= moduleCount) {
        row -= increment;
        increment = -increment;
        break;
      }
    }
  }
}

function lostPoint(matrix: QrMatrix) {
  let score = 0;
  matrix.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      let adjacent = 0;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          if (rowOffset === 0 && columnOffset === 0) continue;
          const targetRow = rowIndex + rowOffset;
          const targetColumn = columnIndex + columnOffset;
          if (
            targetRow >= 0 &&
            targetRow < moduleCount &&
            targetColumn >= 0 &&
            targetColumn < moduleCount &&
            matrix[targetRow][targetColumn] === cell
          ) {
            adjacent += 1;
          }
        }
      }
      if (adjacent > 5) score += 3 + adjacent - 5;
    });
  });

  for (let row = 0; row < moduleCount - 1; row += 1) {
    for (let column = 0; column < moduleCount - 1; column += 1) {
      const cell = matrix[row][column];
      if (
        cell === matrix[row + 1][column] &&
        cell === matrix[row][column + 1] &&
        cell === matrix[row + 1][column + 1]
      ) {
        score += 3;
      }
    }
  }

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount - 6; column += 1) {
      if (
        matrix[row][column] &&
        !matrix[row][column + 1] &&
        matrix[row][column + 2] &&
        matrix[row][column + 3] &&
        matrix[row][column + 4] &&
        !matrix[row][column + 5] &&
        matrix[row][column + 6]
      ) {
        score += 40;
      }
      if (
        matrix[column][row] &&
        !matrix[column + 1][row] &&
        matrix[column + 2][row] &&
        matrix[column + 3][row] &&
        matrix[column + 4][row] &&
        !matrix[column + 5][row] &&
        matrix[column + 6][row]
      ) {
        score += 40;
      }
    }
  }

  const darkCount = matrix.flat().filter(Boolean).length;
  return score + (Math.abs((100 * darkCount) / (moduleCount ** 2) - 50) / 5) * 10;
}

function makeMatrix(value: string) {
  const codewords = makeCodewords(value);
  let bestMatrix: QrMatrix | null = null;
  let bestMaskPattern = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let maskPattern = 0; maskPattern < 8; maskPattern += 1) {
    const matrix = emptyMatrix();
    setupPatterns(matrix);
    setupTypeInfo(matrix, maskPattern, true);
    mapCodewords(matrix, codewords, maskPattern);
    const resolvedMatrix = matrix as QrMatrix;
    const score = lostPoint(resolvedMatrix);
    if (score < bestScore) {
      bestScore = score;
      bestMatrix = resolvedMatrix;
      bestMaskPattern = maskPattern;
    }
  }

  if (bestMatrix === null) throw new Error("Could not create QR code.");

  const finalMatrix = emptyMatrix();
  setupPatterns(finalMatrix);
  setupTypeInfo(finalMatrix, bestMaskPattern, false);
  mapCodewords(finalMatrix, codewords, bestMaskPattern);
  return finalMatrix as QrMatrix;
}

type EntryQrProps = {
  entryContext?: DdongMeongEntryContext;
};

export default function EntryQr({
  entryContext = ddongMeongCampaignEntryContext,
}: EntryQrProps) {
  const entryQuery = entryContextToQuery(entryContext);
  const entryPath = entryQuery
    ? `${ddongMeongEntryPath}?${entryQuery}`
    : ddongMeongEntryPath;
  const entryUrl = useSyncExternalStore(
    () => () => undefined,
    () => `${window.location.origin}${entryPath}`,
    () => null,
  );

  const matrix = useMemo(() => (entryUrl ? makeMatrix(entryUrl) : null), [entryUrl]);
  if (!matrix) return <div aria-hidden="true" className={styles.placeholder} />;

  return (
    <svg
      aria-label={`${entryUrl}으로 들어가는 QR 코드`}
      className={styles.qr}
      role="img"
      shapeRendering="crispEdges"
      viewBox={`-4 -4 ${moduleCount + 8} ${moduleCount + 8}`}
    >
      {matrix.map((row, rowIndex) =>
        row.map((module, columnIndex) =>
          module ? (
            <rect
              height="1"
              key={`${rowIndex}-${columnIndex}`}
              width="1"
              x={columnIndex}
              y={rowIndex}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
