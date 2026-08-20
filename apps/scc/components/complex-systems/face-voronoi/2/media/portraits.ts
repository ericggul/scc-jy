const portraitCount = 56;

export const faceVoronoiPortraitSources = Array.from(
  { length: portraitCount },
  (_, index) =>
    `/images/face-voronoi/portraits/${String(index + 1).padStart(3, "0")}.jpg`,
);
