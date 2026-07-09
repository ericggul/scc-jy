import TranslationGrid from "../TranslationGrid";
import { conversations, languages, matrix } from "./data";

export default function TranslateThree() {
  return (
    <TranslationGrid
      cellHeight={128}
      cellWidth={460}
      conversations={conversations}
      languages={languages}
      matrix={matrix}
    />
  );
}
