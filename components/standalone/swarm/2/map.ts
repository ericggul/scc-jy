import type { Point, PositionConstraint } from "./model";
import countriesData from "./countries.json";
import landData from "./land.json";

type Coordinate = [number, number];
type PolygonCoordinates = Coordinate[][];
type MultiPolygonCoordinates = Coordinate[][][];

type Geometry =
  | { type: "Polygon"; coordinates: PolygonCoordinates }
  | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates };

type Country = {
  id: string;
  name: string;
  population: number;
  major: boolean;
  label: Coordinate;
  geometry: Geometry;
};

export type CampaignIdentity = {
  id: string;
  name: string;
  campaignCode: string;
  campaignName: string;
};

type MapFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PathWriter = Pick<
  CanvasRenderingContext2D,
  "moveTo" | "lineTo" | "closePath"
>;

const countries = (countriesData as unknown as { countries: Country[] }).countries;
const landFeatures = (
  landData as unknown as { features: Array<{ geometry: Geometry }> }
).features;

function getGeometryBounds(geometry: Geometry) {
  let minimumLongitude = Infinity;
  let maximumLongitude = -Infinity;
  let minimumLatitude = Infinity;
  let maximumLatitude = -Infinity;
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [longitude, latitude] of ring) {
        minimumLongitude = Math.min(minimumLongitude, longitude);
        maximumLongitude = Math.max(maximumLongitude, longitude);
        minimumLatitude = Math.min(minimumLatitude, latitude);
        maximumLatitude = Math.max(maximumLatitude, latitude);
      }
    }
  }

  return {
    minimumLongitude,
    maximumLongitude,
    minimumLatitude,
    maximumLatitude,
  };
}

const indexedCountries = countries.map((country) => ({
  country,
  bounds: getGeometryBounds(country.geometry),
}));

const CAMPAIGN_KEYWORDS: Record<string, string> = {
  USA: "America",
  GBR: "Britain",
  KOR: "Korea",
  PRK: "Korea",
  ARE: "Emirates",
  COD: "Congo",
  COG: "Congo",
  CZE: "Czechia",
};

function getCountryCampaign(country: Country): CampaignIdentity {
  const keyword = CAMPAIGN_KEYWORDS[country.id] ?? country.name;
  const initial = keyword.match(/[A-Za-z]/)?.[0].toUpperCase() ?? "X";

  return {
    id: country.id,
    name: country.name,
    campaignCode: `M${initial}GA`,
    campaignName: `Make ${keyword} Great Again`,
  };
}

const OCEAN_CAMPAIGN: CampaignIdentity = {
  id: "OCEAN",
  name: "Ocean",
  campaignCode: "MFGA",
  campaignName: "Make Fishes Great Again",
};

let cachedPaths:
  | {
      width: number;
      height: number;
      graticule: Path2D;
      land: Path2D;
      outline: Path2D;
    }
  | undefined;

let cachedBoundary:
  | {
      width: number;
      height: number;
      top: number;
      bottom: number;
      leftByY: Float32Array;
      rightByY: Float32Array;
    }
  | undefined;

let cachedConstraint:
  | {
      width: number;
      height: number;
      constrain: PositionConstraint;
    }
  | undefined;

const ROBINSON_X = [
  1, 0.9986, 0.9954, 0.99, 0.9822, 0.973, 0.96, 0.9427, 0.9216, 0.8962,
  0.8679, 0.835, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322,
];

const ROBINSON_Y = [
  0, 0.062, 0.124, 0.186, 0.248, 0.31, 0.372, 0.434, 0.4958, 0.5571,
  0.6176, 0.6769, 0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1,
];

const ROBINSON_ASPECT = (0.8487 * Math.PI) / 1.3523;

function interpolateRobinson(latitude: number) {
  const absoluteLatitude = Math.min(90, Math.abs(latitude));
  const lowerIndex = Math.min(17, Math.floor(absoluteLatitude / 5));
  const fraction = (absoluteLatitude - lowerIndex * 5) / 5;

  return {
    x:
      ROBINSON_X[lowerIndex] +
      (ROBINSON_X[lowerIndex + 1] - ROBINSON_X[lowerIndex]) * fraction,
    y:
      ROBINSON_Y[lowerIndex] +
      (ROBINSON_Y[lowerIndex + 1] - ROBINSON_Y[lowerIndex]) * fraction,
  };
}

function inverseRobinsonY(normalizedY: number) {
  const target = Math.min(1, Math.abs(normalizedY - 0.5) * 2);
  let lowerIndex = 0;

  while (
    lowerIndex < ROBINSON_Y.length - 2 &&
    ROBINSON_Y[lowerIndex + 1] < target
  ) {
    lowerIndex += 1;
  }

  const interval = ROBINSON_Y[lowerIndex + 1] - ROBINSON_Y[lowerIndex];
  const fraction = interval === 0 ? 0 : (target - ROBINSON_Y[lowerIndex]) / interval;
  const latitude = (lowerIndex + fraction) * 5;
  const xCoefficient =
    ROBINSON_X[lowerIndex] +
    (ROBINSON_X[lowerIndex + 1] - ROBINSON_X[lowerIndex]) * fraction;

  return {
    latitude: normalizedY > 0.5 ? -latitude : latitude,
    xCoefficient,
  };
}

export function getMapFrame(width: number, height: number): MapFrame {
  if (width / height > ROBINSON_ASPECT) {
    const mapHeight = height;
    const mapWidth = mapHeight * ROBINSON_ASPECT;
    return { x: (width - mapWidth) / 2, y: 0, width: mapWidth, height: mapHeight };
  }

  const mapWidth = width;
  const mapHeight = mapWidth / ROBINSON_ASPECT;
  return { x: 0, y: (height - mapHeight) / 2, width: mapWidth, height: mapHeight };
}

export function projectCoordinate(
  coordinate: Coordinate,
  frame: MapFrame,
): Coordinate {
  const [longitude, latitude] = coordinate;
  const coefficients = interpolateRobinson(latitude);
  const normalizedX = 0.5 + (longitude / 360) * coefficients.x;
  const normalizedY =
    0.5 - Math.sign(latitude) * (coefficients.y / 2);

  return [
    frame.x + normalizedX * frame.width,
    frame.y + normalizedY * frame.height,
  ];
}

function unprojectPoint(x: number, y: number, frame: MapFrame): Coordinate | null {
  const normalizedY = (y - frame.y) / frame.height;
  if (normalizedY < 0 || normalizedY > 1) return null;

  const { latitude, xCoefficient } = inverseRobinsonY(normalizedY);
  const normalizedX = (x - frame.x) / frame.width;
  const longitude = ((normalizedX - 0.5) * 360) / xCoefficient;
  if (longitude < -180 || longitude > 180) return null;

  return [longitude, latitude];
}

function traceRing(
  context: PathWriter,
  ring: Coordinate[],
  frame: MapFrame,
) {
  let previousLongitude: number | null = null;

  for (const coordinate of ring) {
    const [x, y] = projectCoordinate(coordinate, frame);
    const crossesDateLine =
      previousLongitude !== null &&
      Math.abs(coordinate[0] - previousLongitude) > 180;

    if (previousLongitude === null || crossesDateLine) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }

    previousLongitude = coordinate[0];
  }
}

function traceGeometry(
  context: PathWriter,
  geometry: Geometry,
  frame: MapFrame,
) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  for (const polygon of polygons) {
    for (const ring of polygon) traceRing(context, ring, frame);
  }
}

function traceGraticule(
  context: PathWriter,
  frame: MapFrame,
) {
  for (let latitude = -80; latitude <= 80; latitude += 20) {
    const ring: Coordinate[] = [];
    for (let longitude = -180; longitude <= 180; longitude += 2) {
      ring.push([longitude, latitude]);
    }
    traceRing(context, ring, frame);
  }

  for (let longitude = -160; longitude <= 160; longitude += 20) {
    const ring: Coordinate[] = [];
    for (let latitude = -90; latitude <= 90; latitude += 2) {
      ring.push([longitude, latitude]);
    }
    traceRing(context, ring, frame);
  }
}

function traceWorldOutline(
  context: PathWriter,
  frame: MapFrame,
) {
  const outline: Coordinate[] = [];

  for (let latitude = -90; latitude <= 90; latitude += 2) {
    outline.push([-180, latitude]);
  }
  for (let longitude = -180; longitude <= 180; longitude += 2) {
    outline.push([longitude, 90]);
  }
  for (let latitude = 90; latitude >= -90; latitude -= 2) {
    outline.push([180, latitude]);
  }
  for (let longitude = 180; longitude >= -180; longitude -= 2) {
    outline.push([longitude, -90]);
  }

  const [startX, startY] = projectCoordinate(outline[0], frame);
  context.moveTo(startX, startY);
  for (let index = 1; index < outline.length; index += 1) {
    const [x, y] = projectCoordinate(outline[index], frame);
    context.lineTo(x, y);
  }
  context.closePath();
}

export function drawWorldMap(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  if (
    !cachedPaths ||
    cachedPaths.width !== width ||
    cachedPaths.height !== height
  ) {
    const frame = getMapFrame(width, height);
    const graticule = new Path2D();
    const land = new Path2D();
    const outline = new Path2D();

    traceGraticule(graticule, frame);
    for (const feature of landFeatures) {
      traceGeometry(land, feature.geometry, frame);
    }
    traceWorldOutline(outline, frame);
    cachedPaths = { width, height, graticule, land, outline };
  }

  context.save();
  context.strokeStyle = "rgba(51, 78, 65, 0.24)";
  context.lineWidth = 0.5;
  context.stroke(cachedPaths.graticule);

  context.strokeStyle = "rgba(38, 72, 55, 0.58)";
  context.lineWidth = 0.55;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke(cachedPaths.land);

  context.strokeStyle = "rgba(38, 72, 55, 0.68)";
  context.lineWidth = 0.6;
  context.stroke(cachedPaths.outline);
  context.restore();
}

function pointInRing(
  longitude: number,
  latitude: number,
  ring: Coordinate[],
) {
  let inside = false;

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const [currentLongitude, currentLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previous];
    const crossesRay =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) *
          (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude;

    if (crossesRay) inside = !inside;
  }

  return inside;
}

function pointInPolygon(
  longitude: number,
  latitude: number,
  polygon: PolygonCoordinates,
) {
  if (!polygon[0] || !pointInRing(longitude, latitude, polygon[0])) return false;

  for (let holeIndex = 1; holeIndex < polygon.length; holeIndex += 1) {
    if (pointInRing(longitude, latitude, polygon[holeIndex])) return false;
  }

  return true;
}

export function findCampaignAtPoint(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const frame = getMapFrame(width, height);
  const coordinate = unprojectPoint(x, y, frame);
  if (!coordinate) return null;
  const [longitude, latitude] = coordinate;

  for (const { country, bounds } of indexedCountries) {
    if (
      longitude < bounds.minimumLongitude ||
      longitude > bounds.maximumLongitude ||
      latitude < bounds.minimumLatitude ||
      latitude > bounds.maximumLatitude
    ) {
      continue;
    }

    const polygons =
      country.geometry.type === "Polygon"
        ? [country.geometry.coordinates]
        : country.geometry.coordinates;

    if (
      polygons.some((polygon) =>
        pointInPolygon(longitude, latitude, polygon),
      )
    ) {
      return getCountryCampaign(country);
    }
  }

  return OCEAN_CAMPAIGN;
}

export function isPointInsideWorld(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const boundary = getBoundaryLookup(width, height);
  if (y < boundary.top || y > boundary.bottom) return false;
  const row = Math.min(
    boundary.leftByY.length - 1,
    Math.max(0, Math.round(y)),
  );
  return x >= boundary.leftByY[row] && x <= boundary.rightByY[row];
}

function getBoundaryLookup(width: number, height: number) {
  if (
    cachedBoundary &&
    cachedBoundary.width === width &&
    cachedBoundary.height === height
  ) {
    return cachedBoundary;
  }

  const frame = getMapFrame(width, height);
  const rowCount = Math.ceil(height) + 1;
  const leftByY = new Float32Array(rowCount);
  const rightByY = new Float32Array(rowCount);

  for (let row = 0; row < rowCount; row += 1) {
    const normalizedY = Math.min(
      1,
      Math.max(0, (row - frame.y) / frame.height),
    );
    const { xCoefficient } = inverseRobinsonY(normalizedY);
    leftByY[row] = frame.x + frame.width * (0.5 - xCoefficient / 2);
    rightByY[row] = frame.x + frame.width * (0.5 + xCoefficient / 2);
  }

  cachedBoundary = {
    width,
    height,
    top: frame.y,
    bottom: frame.y + frame.height,
    leftByY,
    rightByY,
  };
  return cachedBoundary;
}

export function getWorldConstraint(
  width: number,
  height: number,
): PositionConstraint {
  if (
    cachedConstraint &&
    cachedConstraint.width === width &&
    cachedConstraint.height === height
  ) {
    return cachedConstraint.constrain;
  }

  const boundary = getBoundaryLookup(width, height);
  const constrain: PositionConstraint = (point: Point) => {
    const correctedY = Math.min(
      boundary.bottom,
      Math.max(boundary.top, point.y),
    );
    const row = Math.min(
      boundary.leftByY.length - 1,
      Math.max(0, Math.round(correctedY)),
    );
    const left = boundary.leftByY[row];
    const right = boundary.rightByY[row];
    const correctedX = Math.min(right, Math.max(left, point.x));

    if (correctedX === point.x && correctedY === point.y) return null;

    const correctionX = correctedX - point.x;
    const correctionY = correctedY - point.y;
    const correctionLength = Math.hypot(correctionX, correctionY) || 1;

    return {
      point: { x: correctedX, y: correctedY },
      inwardNormal: {
        x: correctionX / correctionLength,
        y: correctionY / correctionLength,
      },
    };
  };

  cachedConstraint = { width, height, constrain };
  return constrain;
}

export const majorCountryCoordinates = countries
  .filter((country) => country.major)
  .map((country) => ({
    id: country.id,
    name: country.name,
    population: country.population,
    longitude: country.label[0],
    latitude: country.label[1],
  }));

export const countryCoordinates = countries.map((country) => ({
  id: country.id,
  name: country.name,
  longitude: country.label[0],
  latitude: country.label[1],
}));
