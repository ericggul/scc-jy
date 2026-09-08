import source from "./source/document.json";
import SourceFrame from "./source-frame";

export default function SpoonClassDefault() {
  return <SourceFrame html={source.html} />;
}
