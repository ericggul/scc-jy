import MeditationContentExperience from "../../content/experience";
import { findMobileMeditationContent } from "../../content/registry";

const dummyContent = findMobileMeditationContent("dummy");

export default function DummyMeditationContent() {
  return (
    <MeditationContentExperience content={dummyContent} />
  );
}
