# Flight network experiment

Route: `/flight-network/1`, registered through the flight-network experiment
registry and owned by the filesystem-only `complex-systems` group.

Date: 2026-08-13.

## Interface premise

1. **Participant situation:** one person observes an entirely synthetic world
   of cities, routes, ticket inventory, and flights from a single map.
2. **Primary parameter:** the feedback between a city's accessibility and the
   travel demand that creates or removes its air links.
3. **Perceptual job:** distinguish a persistent route from a temporary aircraft;
   see flights depart, traverse the map, arrive, and disappear while routes open
   and close on a slower timescale.
4. **Interaction job:** select an aircraft for route, progress, passengers,
   fare, and next-seat information; select a city to inspect access, congestion,
   and appeal or introduce a temporary demand event.
5. **Wrapper justification:** the synthetic world map makes geographic distance,
   city reach, route persistence, and aircraft movement perceptible in the same
   plane. A small selection panel follows the map-first flight-tracker grammar.
6. **System family:** pale water, quiet land, charcoal cities and routes, yellow
   aircraft, and rust for newly opened routes or demand events. All distinctions
   encode simulation state rather than city identity.
7. **Removal test:** the map, cities, routes, aircraft, selection details, four
   activity counts, time control, pause, and reset remain. Real-world geography,
   weather, airline branding, filters, ads, accounts, and status chrome are absent.

## Bounded trial

- **Baseline:** the SCC single-viewport client-local complex-system structure.
  The prior network experiments informed separation of model and screen only.
- **Changed variable:** nodes become synthetic cities fixed in geography. Pair
  demand books seats; viable routes schedule flights; flights become temporary
  moving entities and disappear at arrival; persistent weak routes are removed.
- **Feedback loop:** population, economy, appeal, time of day, and accessibility
  create demand. Demand improves route load and frequency. Arrivals increase
  accessibility but also congestion. Accessibility supports economy and appeal,
  while congestion suppresses appeal, demand, fares, and route viability.
- **Retained invariants:** stable IDs, pure domain-state transitions, a thin
  dynamic route, one viewport, direct observation, no socket, no external map,
  no real flight data, and no new dependency.
- **Observable result:** a 1,440-hour pure-model run opened and closed 55
  routes, completed 4,156 of 4,170 departed flights, preserved unique routes,
  and kept city and route values finite. Browser appearance and interaction
  remain unobserved in this implementation pass.
- **Unresolved question:** should a later trial add competing airlines with
  separate fleet constraints, or would that obscure the city–route feedback?

## Reference boundary

Flightradar24 is used as an interaction reference, not as a visual or data copy.
Its official product documentation describes a map-centered view, selectable
aircraft, route and schedule information, progress, aircraft position, and
airport arrival/departure context. This experiment retains only that observation
grammar. It does not reproduce Flightradar24 branding, proprietary geography,
aircraft data, coverage claims, or subscription features.
