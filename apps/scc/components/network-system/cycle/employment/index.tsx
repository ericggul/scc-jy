"use client";

import { useState } from "react";
import styled from "styled-components";
import { createInitialCycleSnapshot } from "@/components/network-system/cycle/model";
import { useCycleSocket } from "@/components/network-system/cycle/transport";
import {
  EMPLOYMENT_FAMILY_COLUMNS,
  EMPLOYMENT_FAMILY_COUNT,
  EMPLOYMENT_FAMILY_ROWS,
  presentCycleEmploymentFamilies,
} from "./presenter";

const Stage = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #f4f3ef;
  color: #11110f;
`;

const FamilyGrid = styled.ol`
  display: grid;
  grid-template-columns: repeat(${EMPLOYMENT_FAMILY_COLUMNS}, minmax(0, 1fr));
  grid-template-rows: repeat(${EMPLOYMENT_FAMILY_ROWS}, minmax(0, 1fr));
  width: 100%;
  height: 100%;
  margin: 0;
  padding: clamp(10px, 2.2vmin, 30px);
  gap: clamp(2px, 0.45vmin, 7px);
  list-style: none;
  box-sizing: border-box;
  contain: strict;

  @media (orientation: landscape) {
    grid-template-columns: repeat(${EMPLOYMENT_FAMILY_ROWS}, minmax(0, 1fr));
    grid-template-rows: repeat(${EMPLOYMENT_FAMILY_COLUMNS}, minmax(0, 1fr));
  }
`;

const Family = styled.li<{ $distressed: boolean }>`
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  overflow: hidden;
  background: ${({ $distressed }) => ($distressed ? "#11110f" : "transparent")};
  color: ${({ $distressed }) => ($distressed ? "#f4f3ef" : "#11110f")};
  transition:
    background-color 180ms ease-out,
    color 180ms ease-out;
  contain: strict;

  svg {
    width: 78%;
    height: 78%;
    overflow: visible;
  }

  .happy,
  .distressed {
    transform-box: fill-box;
    transform-origin: center;
    transition:
      opacity 180ms ease-out,
      transform 180ms ease-out;
  }

  .happy {
    opacity: ${({ $distressed }) => ($distressed ? 0 : 1)};
    transform: ${({ $distressed }) =>
      $distressed ? "translateY(-3px) scale(0.96)" : "none"};
  }

  .distressed {
    opacity: ${({ $distressed }) => ($distressed ? 1 : 0)};
    transform: ${({ $distressed }) =>
      $distressed ? "none" : "translateY(3px) scale(0.96)"};
  }

  @media (prefers-reduced-motion: reduce) {
    &, .happy, .distressed {
      transition: none;
    }
  }
`;

function FamilyGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 80 96">
      <g className="happy" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2">
        <circle cx="23" cy="25" r="10" />
        <circle cx="57" cy="25" r="10" />
        <circle cx="40" cy="51" r="8" />
        <path d="M18 25q5 5 10 0M52 25q5 5 10 0M36 51q4 4 8 0" />
        <path d="M8 82V55c0-10 6-16 15-16s15 6 15 16v27M42 82V55c0-10 6-16 15-16s15 6 15 16v27" />
        <path d="M28 82V70c0-8 5-13 12-13s12 5 12 13v12M23 40l17 17 17-17" />
      </g>
      <g className="distressed" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2">
        <circle cx="23" cy="29" r="10" />
        <circle cx="57" cy="29" r="10" />
        <circle cx="40" cy="54" r="8" />
        <path d="M18 32q5-5 10 0M52 32q5-5 10 0M36 57q4-4 8 0" />
        <path d="M8 84V61c0-10 6-16 15-16s15 6 15 16v23M42 84V61c0-10 6-16 15-16s15 6 15 16v23" />
        <path d="M28 84V73c0-8 5-13 12-13s12 5 12 13v11M23 46l17 14 17-14" />
        <path d="M18 36v7M62 36v7M36 61v6" />
      </g>
    </svg>
  );
}

export default function CycleEmploymentScreen() {
  const [familyState, setFamilyState] = useState(() =>
    presentCycleEmploymentFamilies(createInitialCycleSnapshot()),
  );

  useCycleSocket({
    role: "screen",
    retainState: false,
    onState: (snapshot) =>
      setFamilyState(presentCycleEmploymentFamilies(snapshot)),
  });

  return (
    <Stage aria-label="Families affected by falling employment">
      <FamilyGrid>
        {Array.from({ length: EMPLOYMENT_FAMILY_COUNT }, (_, index) => (
          <Family
            key={`family-${index}`}
            $distressed={index < familyState.distressedCount}
          >
            <FamilyGlyph />
          </Family>
        ))}
      </FamilyGrid>
    </Stage>
  );
}
