const politicianCount = 60;

export const faceVoronoiPoliticianSources = Array.from(
  { length: politicianCount },
  (_, index) =>
    `/images/face-voronoi/politicians/${String(index + 1).padStart(3, "0")}.jpg`,
);
