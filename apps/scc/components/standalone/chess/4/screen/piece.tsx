import type { Piece } from "../model";
import styles from "./chess.module.css";

const typeName = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

export default function ChessPiece({ index, piece }: { index: number; piece: Piece }) {
  const color = piece.color === "w" ? "white" : "black";
  return <span aria-hidden="true" className={styles.semanticPiece}><span>{color}-</span><span>{typeName[piece.type]}-{String(index).padStart(2, "0")}</span></span>;
}
