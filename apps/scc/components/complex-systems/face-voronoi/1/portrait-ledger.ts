export type FacePortrait = {
  id: string;
  src: string;
  sourceUrl: string;
};

const SOURCE_INDICES = [
  2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 42, 43, 44, 45, 46, 47,
  49, 51, 52, 53, 56, 57, 58, 59, 60, 63, 64, 65, 66, 67, 68, 69, 70,
] as const;

export const FACE_PORTRAITS: readonly FacePortrait[] = SOURCE_INDICES.map(
  (sourceIndex, index) => {
    const fileName = String(index + 1).padStart(3, "0");

    return {
      id: `face-voronoi-portrait-${fileName}`,
      src: `/images/face-voronoi/portraits/${fileName}.jpg`,
      sourceUrl: `https://i.pravatar.cc/720?img=${sourceIndex}`,
    };
  },
);
