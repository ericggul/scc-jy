export type City = {
  id: string;
  code: string;
  name: string;
  x: number;
  y: number;
  population: number;
  economy: number;
  appeal: number;
  accessibility: number;
  congestion: number;
  demandPulse: number;
  timezone: number;
};

export type AirRoute = {
  id: string;
  source: string;
  target: string;
  capacity: number;
  booked: number;
  fare: number;
  interval: number;
  untilDeparture: number;
  demand: number;
  loadFactor: number;
  viability: number;
  weakHours: number;
  age: number;
};

export type Flight = {
  id: string;
  callsign: string;
  routeId: string;
  source: string;
  target: string;
  progress: number;
  duration: number;
  passengers: number;
  capacity: number;
  fare: number;
};

export type FlightWorld = {
  cities: City[];
  routes: AirRoute[];
  flights: Flight[];
  elapsedHours: number;
  nextRoute: number;
  nextFlight: number;
  routeReviewIn: number;
  randomState: number;
  totals: {
    departed: number;
    arrived: number;
    routesOpened: number;
    routesClosed: number;
  };
};

export type FlightWorldEvents = {
  departed: number;
  arrived: number;
  routesOpened: number;
  routesClosed: number;
};

export type FlightWorldStep = {
  world: FlightWorld;
  events: FlightWorldEvents;
};

const CITY_SEEDS: Array<Omit<City, "accessibility" | "congestion" | "demandPulse">> = [
  { id: "aster", code: "AST", name: "Aster", x: 0.12, y: 0.31, population: 0.74, economy: 0.78, appeal: 0.66, timezone: -8 },
  { id: "northreach", code: "NRC", name: "Northreach", x: 0.2, y: 0.2, population: 0.42, economy: 0.68, appeal: 0.58, timezone: -7 },
  { id: "solace", code: "SOL", name: "Solace", x: 0.22, y: 0.48, population: 0.62, economy: 0.57, appeal: 0.82, timezone: -6 },
  { id: "cinder", code: "CIN", name: "Cinder", x: 0.29, y: 0.68, population: 0.51, economy: 0.49, appeal: 0.71, timezone: -4 },
  { id: "meridian", code: "MRD", name: "Meridian", x: 0.43, y: 0.27, population: 0.91, economy: 0.88, appeal: 0.74, timezone: 0 },
  { id: "brume", code: "BRM", name: "Brume", x: 0.49, y: 0.18, population: 0.49, economy: 0.75, appeal: 0.63, timezone: 1 },
  { id: "oria", code: "ORI", name: "Oria", x: 0.51, y: 0.42, population: 0.8, economy: 0.73, appeal: 0.69, timezone: 2 },
  { id: "vale", code: "VAL", name: "Vale", x: 0.46, y: 0.62, population: 0.57, economy: 0.53, appeal: 0.78, timezone: 2 },
  { id: "lumen", code: "LUM", name: "Lumen", x: 0.58, y: 0.7, population: 0.39, economy: 0.61, appeal: 0.86, timezone: 3 },
  { id: "talus", code: "TLS", name: "Talus", x: 0.62, y: 0.3, population: 0.7, economy: 0.64, appeal: 0.56, timezone: 5 },
  { id: "pelago", code: "PLG", name: "Pelago", x: 0.68, y: 0.5, population: 0.44, economy: 0.58, appeal: 0.88, timezone: 6 },
  { id: "serein", code: "SRN", name: "Serein", x: 0.72, y: 0.22, population: 0.86, economy: 0.83, appeal: 0.67, timezone: 7 },
  { id: "nacre", code: "NCR", name: "Nacre", x: 0.79, y: 0.38, population: 0.77, economy: 0.76, appeal: 0.73, timezone: 8 },
  { id: "morrow", code: "MRW", name: "Morrow", x: 0.86, y: 0.28, population: 0.48, economy: 0.7, appeal: 0.64, timezone: 9 },
  { id: "isola", code: "ISO", name: "Isola", x: 0.82, y: 0.58, population: 0.55, economy: 0.59, appeal: 0.84, timezone: 10 },
  { id: "auric", code: "AUR", name: "Auric", x: 0.89, y: 0.7, population: 0.43, economy: 0.66, appeal: 0.77, timezone: 11 },
  { id: "vesper", code: "VSP", name: "Vesper", x: 0.35, y: 0.4, population: 0.46, economy: 0.55, appeal: 0.72, timezone: -2 },
  { id: "delta", code: "DLT", name: "Delta", x: 0.64, y: 0.59, population: 0.68, economy: 0.62, appeal: 0.6, timezone: 5 },
];

const EMPTY_EVENTS: FlightWorldEvents = {
  departed: 0,
  arrived: 0,
  routesOpened: 0,
  routesClosed: 0,
};

function clamp(value: number, low = 0, high = 1) {
  return Math.min(high, Math.max(low, value));
}

function nextRandom(state: number): [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned || 0x9e3779b9, unsigned / 0x100000000];
}

export function routeKey(source: string, target: string) {
  return source < target ? `${source}:${target}` : `${target}:${source}`;
}

export function cityDistance(source: City, target: City) {
  const dx = Math.abs(source.x - target.x);
  const wrappedX = Math.min(dx, 1 - dx);
  return Math.hypot(wrappedX * 1.65, (source.y - target.y) * 1.15);
}

function localDayFactor(city: City, elapsedHours: number) {
  const localHour = ((elapsedHours + city.timezone) % 24 + 24) % 24;
  return 0.68 + Math.max(0, Math.sin(((localHour - 5) / 24) * Math.PI * 2)) * 0.5;
}

export function pairDemand(source: City, target: City, elapsedHours: number) {
  const distance = Math.max(0.09, cityDistance(source, target));
  const scale = Math.sqrt(source.population * target.population);
  const purchasingPower = (source.economy + target.economy) * 0.5;
  const desire = (source.appeal + target.appeal) * 0.5;
  const access = 0.78 + (source.accessibility + target.accessibility) * 0.22;
  const congestionPenalty = 1 - (source.congestion + target.congestion) * 0.2;
  const pulse = 1 + (source.demandPulse + target.demandPulse) * 0.7;
  const day = (localDayFactor(source, elapsedHours) + localDayFactor(target, elapsedHours)) * 0.5;
  return clamp(
    (scale * purchasingPower * desire * access * congestionPenalty * pulse * day) /
      Math.pow(distance + 0.28, 1.22),
    0,
    2.5,
  );
}

function makeRoute(
  id: number,
  source: City,
  target: City,
  demand: number,
  offset: number,
): AirRoute {
  const distance = cityDistance(source, target);
  const capacity = Math.round(54 + clamp(demand / 1.45) * 112);
  return {
    id: `route-${id}`,
    source: source.id,
    target: target.id,
    capacity,
    booked: Math.round(capacity * (0.22 + offset * 0.28)),
    fare: Math.round(44 + distance * 510),
    interval: clamp(16 - demand * 7.5 + distance * 4, 3.5, 20),
    untilDeparture: 1 + offset * 8,
    demand,
    loadFactor: 0.54,
    viability: 0.58,
    weakHours: 0,
    age: 0,
  };
}

function bestUnservedPair(world: FlightWorld) {
  const existing = new Set(
    world.routes.map((route) => routeKey(route.source, route.target)),
  );
  let best: { source: City; target: City; demand: number; score: number } | null = null;
  for (let index = 0; index < world.cities.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < world.cities.length; otherIndex += 1) {
      const source = world.cities[index];
      const target = world.cities[otherIndex];
      if (existing.has(routeKey(source.id, target.id))) continue;
      const demand = pairDemand(source, target, world.elapsedHours);
      const distance = cityDistance(source, target);
      const isolation = 1.1 - Math.min(source.accessibility, target.accessibility) * 0.24;
      const score = demand * isolation * (0.82 + Math.min(distance, 0.8) * 0.18);
      if (!best || score > best.score) best = { source, target, demand, score };
    }
  }
  return best;
}

export function createFlightWorld(seed = 0x51f15e): FlightWorld {
  let randomState = seed >>> 0 || 1;
  const cities = CITY_SEEDS.map((city) => ({
    ...city,
    accessibility: 0.18,
    congestion: 0.08,
    demandPulse: 0,
  }));
  const candidates = cities.flatMap((source, index) =>
    cities.slice(index + 1).map((target) => ({
      source,
      target,
      demand: pairDemand(source, target, 0),
    })),
  ).sort((a, b) => b.demand - a.demand);
  const routes: AirRoute[] = [];
  const degree = new Map<string, number>();
  for (const candidate of candidates) {
    if (routes.length >= 22) break;
    if ((degree.get(candidate.source.id) ?? 0) >= 4 || (degree.get(candidate.target.id) ?? 0) >= 4) continue;
    let offset: number;
    [randomState, offset] = nextRandom(randomState);
    routes.push(
      makeRoute(routes.length + 1, candidate.source, candidate.target, candidate.demand, offset),
    );
    degree.set(candidate.source.id, (degree.get(candidate.source.id) ?? 0) + 1);
    degree.set(candidate.target.id, (degree.get(candidate.target.id) ?? 0) + 1);
  }
  return {
    cities,
    routes,
    flights: [],
    elapsedHours: 0,
    nextRoute: routes.length + 1,
    nextFlight: 1,
    routeReviewIn: 2,
    randomState,
    totals: { ...EMPTY_EVENTS },
  };
}

function updateCities(world: FlightWorld, hours: number, arrivalCounts: ReadonlyMap<string, number>) {
  const activeByCity = new Map<string, number>();
  for (const route of world.routes) {
    activeByCity.set(route.source, (activeByCity.get(route.source) ?? 0) + route.viability);
    activeByCity.set(route.target, (activeByCity.get(route.target) ?? 0) + route.viability);
  }
  return world.cities.map((city) => {
    const links = activeByCity.get(city.id) ?? 0;
    const arrivals = arrivalCounts.get(city.id) ?? 0;
    const targetAccessibility = clamp(0.08 + links * 0.14);
    const congestion = clamp(
      city.congestion * Math.pow(0.9, hours) + arrivals * 0.055 + Math.max(0, links - 4) * hours * 0.004,
    );
    const accessibility = clamp(
      city.accessibility + (targetAccessibility - city.accessibility) * hours * 0.045,
    );
    const appealTarget = clamp(
      0.46 + city.economy * 0.18 + accessibility * 0.3 - congestion * 0.34,
    );
    const economyTarget = clamp(
      city.economy + (accessibility - 0.42) * 0.0008 - congestion * 0.0005,
      0.22,
      0.96,
    );
    return {
      ...city,
      accessibility,
      congestion,
      appeal: clamp(city.appeal + (appealTarget - city.appeal) * hours * 0.018),
      economy: clamp(city.economy + (economyTarget - city.economy) * hours * 0.02, 0.22, 0.96),
      demandPulse: Math.max(0, city.demandPulse - hours * 0.035),
    };
  });
}

export function stepFlightWorld(
  world: FlightWorld,
  realSeconds: number,
  hoursPerSecond = 2.4,
): FlightWorldStep {
  const hours = Math.min(realSeconds * hoursPerSecond, 0.16);
  const events = { ...EMPTY_EVENTS };
  let randomState = world.randomState;
  const cityById = new Map(world.cities.map((city) => [city.id, city]));
  const routeDegree = new Map<string, number>();
  for (const route of world.routes) {
    routeDegree.set(route.source, (routeDegree.get(route.source) ?? 0) + 1);
    routeDegree.set(route.target, (routeDegree.get(route.target) ?? 0) + 1);
  }
  const arrivalCounts = new Map<string, number>();
  const retainedFlights: Flight[] = [];

  for (const flight of world.flights) {
    const progress = flight.progress + hours / flight.duration;
    if (progress >= 1) {
      events.arrived += 1;
      arrivalCounts.set(flight.target, (arrivalCounts.get(flight.target) ?? 0) + 1);
      continue;
    }
    retainedFlights.push({ ...flight, progress });
  }

  let nextFlight = world.nextFlight;
  const departingFlights: Flight[] = [];
  const routes = world.routes.map((route) => {
    const source = cityById.get(route.source);
    const target = cityById.get(route.target);
    if (!source || !target) return route;
    const demand = pairDemand(source, target, world.elapsedHours);
    const distance = cityDistance(source, target);
    const fareResistance = clamp(route.fare / Math.max(75, 120 + distance * 440), 0.45, 1.8);
    const competingLinks =
      (routeDegree.get(route.source) ?? 0) +
      (routeDegree.get(route.target) ?? 0);
    const competition = 1 + Math.max(0, competingLinks - 5) * 0.12;
    const bookingRate =
      demand * 7.8 * (1 - (source.congestion + target.congestion) * 0.2) /
      (fareResistance * competition);
    let booked = Math.min(route.capacity, route.booked + bookingRate * hours);
    let untilDeparture = route.untilDeparture - hours;
    let loadFactor = route.loadFactor;
    let viability = route.viability;
    let capacity = route.capacity;
    let interval = route.interval;

    if (untilDeparture <= 0) {
      const passengers = Math.floor(booked);
      const currentLoad = passengers / Math.max(1, capacity);
      loadFactor = clamp(loadFactor + (currentLoad - loadFactor) * 0.38);
      viability = clamp(
        viability +
          (currentLoad - (0.58 + distance * 0.12)) * 0.24 -
          (source.congestion + target.congestion) * 0.035,
      );
      if (passengers >= Math.max(18, capacity * 0.24)) {
        departingFlights.push({
          id: `flight-${nextFlight}`,
          callsign: `${source.code}${String(100 + (nextFlight * 37) % 900)}`,
          routeId: route.id,
          source: source.id,
          target: target.id,
          progress: 0,
          duration: clamp(1.2 + distance * 10.5, 1.4, 12),
          passengers,
          capacity,
          fare: route.fare,
        });
        nextFlight += 1;
        events.departed += 1;
        booked = 0;
      } else {
        booked *= 0.72;
        viability = clamp(viability - 0.045);
      }
      interval = clamp(interval + (0.62 - loadFactor) * 1.2, 3.2, 22);
      capacity = Math.round(clamp(capacity + (loadFactor - 0.7) * 16, 44, 190));
      untilDeparture = interval;
    }

    const targetFare = 48 + distance * 500 + (source.congestion + target.congestion) * 46 - demand * 18;
    const fare = clamp(route.fare + (targetFare - route.fare) * hours * 0.025, 42, 620);
    const weakHours = viability < 0.3 || loadFactor < 0.34
      ? route.weakHours + hours
      : Math.max(0, route.weakHours - hours * 0.4);
    return {
      ...route,
      booked,
      capacity,
      fare,
      interval,
      untilDeparture,
      demand: route.demand + (demand - route.demand) * hours * 0.12,
      loadFactor,
      viability,
      weakHours,
      age: route.age + hours,
    };
  });

  const activeFlightRoutes = new Set(
    [...retainedFlights, ...departingFlights].map((flight) => flight.routeId),
  );
  const viableRoutes = routes.filter((route) => {
    const closes = route.age > 30 && route.weakHours > 20 && !activeFlightRoutes.has(route.id);
    if (closes) events.routesClosed += 1;
    return !closes;
  });

  let nextRoute = world.nextRoute;
  let routeReviewIn = world.routeReviewIn - hours;
  let nextRoutes = viableRoutes;
  if (routeReviewIn <= 0 && viableRoutes.length < 34) {
    const provisionalWorld = {
      ...world,
      routes: viableRoutes,
      elapsedHours: world.elapsedHours + hours,
    };
    const candidate = bestUnservedPair(provisionalWorld);
    let chance: number;
    [randomState, chance] = nextRandom(randomState);
    if (candidate && candidate.score > 0.48 && chance < clamp((candidate.score - 0.38) * 0.46, 0.1, 0.72)) {
      let offset: number;
      [randomState, offset] = nextRandom(randomState);
      nextRoutes = [
        ...viableRoutes,
        makeRoute(nextRoute, candidate.source, candidate.target, candidate.demand, offset),
      ];
      nextRoute += 1;
      events.routesOpened += 1;
    }
    routeReviewIn = 2.5;
  }

  const interimWorld: FlightWorld = {
    ...world,
    routes: nextRoutes,
    flights: [...retainedFlights, ...departingFlights],
    elapsedHours: world.elapsedHours + hours,
    nextRoute,
    nextFlight,
    routeReviewIn,
    randomState,
    totals: {
      departed: world.totals.departed + events.departed,
      arrived: world.totals.arrived + events.arrived,
      routesOpened: world.totals.routesOpened + events.routesOpened,
      routesClosed: world.totals.routesClosed + events.routesClosed,
    },
  };
  return {
    world: {
      ...interimWorld,
      cities: updateCities(interimWorld, hours, arrivalCounts),
    },
    events,
  };
}

export function pulseCityDemand(world: FlightWorld, cityId: string): FlightWorld {
  return {
    ...world,
    cities: world.cities.map((city) =>
      city.id === cityId
        ? { ...city, demandPulse: clamp(city.demandPulse + 0.72, 0, 1.4) }
        : city,
    ),
  };
}

export function findCity(world: FlightWorld, id: string) {
  return world.cities.find((city) => city.id === id);
}

export function findRoute(world: FlightWorld, id: string) {
  return world.routes.find((route) => route.id === id);
}
