import TranslationGrid from "../TranslationGrid";
import { conversations, languages, matrix } from "./data";

export default function TranslateGridExperiment() {
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
