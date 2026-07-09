import TranslationGrid from "../TranslationGrid";
import { conversations, languages, matrix } from "./data";

export default function TranslateTwo() {
  return (
    <TranslationGrid
      conversations={conversations}
      languages={languages}
      matrix={matrix}
    />
  );
}
