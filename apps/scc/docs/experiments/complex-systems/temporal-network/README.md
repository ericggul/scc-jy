# Temporal network — repair relay

Route: `/temporal-network/repair-relay`.

Date: 2026-08-14.

## Model card

1. **Object and boundary:** This is a deliberately synthetic mutual-repair
   network, not a calibrated representation of a company, utility, emergency
   service, or social group. Twelve repair cells have a bounded local reserve
   and a learned local repair rate. They meet only at scheduled pairwise contact
   events.
2. **Local state and action:** a cell holds fault knowledge, may commit a finite
   aid packet from its reserve, can pass that packet only at a contact, restores
   faults at a rate set by its practice, and gains practice after a completed
   repair. A contact exchanges newly known faults. Each newly learned fault
   stores the local sender as its reverse relay; aid returns only when a later
   contact reaches that stored sender. Useful aid reinforces the contact's
   future carrying capacity.
3. **Macro observable:** service loss, fault knowledge, packet routes, and the
   difference between ordered and time-permuted contact sequences accumulate
   from these local rules. A click introduces a fault on one thread; the
   participant can predict whether future stitches leave enough temporal path
   for assistance to arrive.
4. **Representation boundary:** horizontal threads are repair cells; each
   vertical stitch is one scheduled contact event `(i, j, t)`. The now-line is
   a real time boundary. Green marks are propagated knowledge or completed
   repairs, ochre beads are aid packets, and rust diamonds are faults. No
   strokes, particles, or motion exist merely to make the model look active.
5. **Contrast:** `sequence` uses a bursty contact sequence. `permute time`
   implements a Randomly Permuted times-style null model: it preserves the
   number of contacts on every pair and the global multiset of timestamps, but
   assigns timestamps to contact events differently. It resets the synthetic
   state so the two conditions have the same initial seed.

## Scientific scope

The temporal-network framework is taken from Holme and Saramäki's review,
[*Temporal networks*](https://doi.org/10.1016/j.physrep.2012.03.001): contacts
are represented as time-stamped events, and propagation requires a
time-respecting path. The implementation specifically tests the review's point
that a static path `A-B-C` does not imply an operational path from `A` to `C`
when the `B-C` event has already happened.

This is not a reproduction of an empirical contact dataset, a disease model,
or evidence that real repair organizations are antifragile. Its bounded
anti-fragility mechanism is only this: successful repair increases local
practice and useful contacts gain carrying capacity, while reserve remains
finite and faults can still accumulate. Any claim beyond that requires a
separate matched-volatility experiment and an explicit welfare/ruin measure.

## Design contract

1. **Participant situation:** a person introduces a local failure into an
   already running temporal contact field and reads the availability of later,
   not merely adjacent, relations.
2. **Primary parameter:** the temporal order of contacts.
3. **Perceptual job:** make it possible to see that the same pairwise graph can
   permit or block support according to sequence.
4. **Interaction job:** pressing a thread makes a fault; switching sequence to
   permuted time changes the actual schedule, not its paint.
5. **Wrapper justification:** the time-expanded thread field turns sequence
   into the plane of interaction. It avoids a conventional force-directed
   node-link graph because simultaneous spatial adjacency would conceal the
   causality being tested.
6. **Removal test:** the threads, contact stitches, now-line, fault marks,
   propagated traces, direct fault input, and sequence permutation remain.
   Titles, node cards, network statistics, legends, grids, faux monitoring
   metadata, and ornamental particles are omitted.

## Tests

`model.test.ts` verifies deterministic seeded evolution, no invalid endpoint or
packet references, the non-transitivity of a reversed contact sequence, exact
contact-count/timestamp preservation under permutation, a changed macro
trajectory under the same seeded fault, and a causal learning gain after a
resolved fault.
