"use client";

import type { CvDocument } from "../1/types";
import { CvPlane } from "../2";

function keepSamePerson(cv: CvDocument): CvDocument {
  return {
    ...cv,
    person: {
      ...cv.person,
      id: `${cv.person.id}-jeanyoon-choi`,
      name: "Jeanyoon Choi",
    },
  };
}

export default function CvThree() {
  return <CvPlane transformCv={keepSamePerson} label="CV three" />;
}
