import type { Piece } from "../model";

// Original flat silhouettes, drawn on a shared 48-unit grid.
export default function ChessPiece({ piece }: { piece: Piece }) {
  const light = piece.color === "w";
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" fill={light ? "#ffffff" : "#222222"} stroke={light ? "#222222" : "#111111"} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
      {piece.type === "p" && <><circle cx="24" cy="14" r="5.5" /><path d="M20 20h8l-1 7 5 8H16l5-8z" /><path d="M15 35h18v5H15z" /></>}
      {piece.type === "r" && <><path d="M13 9h5v5h4V9h4v5h4V9h5v12l-5 3 1 11H17l1-11-5-3z" /><path d="M14 35h20v5H14zM18 23h12" /></>}
      {piece.type === "n" && <><path d="M15 35c0-7 9-10 10-16l-8 6-6-4 5-11 9-4 1 5c9 3 10 13 7 24z" /><path d="M14 35h21v5H14z" /><circle cx="21" cy="15" r="1" fill={light ? "#222222" : "#ffffff"} stroke="none" /></>}
      {piece.type === "b" && <><path d="M24 6c-3 5-9 7-9 13 0 4 4 7 9 7s9-3 9-7c0-6-6-8-9-13zM20 27h8l4 8H16z" /><path d="m27 12-5 8M14 35h20v5H14z" /></>}
      {piece.type === "q" && <><path d="m12 14 5 17h14l5-17-8 7-4-10-4 10zM17 31h14l3 9H14z" /><circle cx="11" cy="12" r="2.5" /><circle cx="24" cy="8" r="2.5" /><circle cx="37" cy="12" r="2.5" /><path d="M17 35h14" /></>}
      {piece.type === "k" && <><path d="M24 5v10m-4-6h8" fill="none" /><path d="M24 18c-9-10-17 1-10 9l4 5h12l4-5c7-8-1-19-10-9zM18 32h12l4 8H14z" /><path d="M24 18v10M17 36h14" /></>}
    </svg>
  );
}
