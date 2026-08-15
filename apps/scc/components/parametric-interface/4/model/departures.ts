export type Departure = {
  id: string;
  time: string;
  carrier: "gold" | "red" | "white" | "aqua";
  flight: string;
  codeshare: string;
  destination: string;
  terminal: string;
  gate: string;
  status: string;
};

export const departures = [
  { id: "d-01", time: "10:05", carrier: "red", flight: "AC 845", codeshare: "SN 9680", destination: "Montreal", terminal: "1", gate: "B42", status: "Boarding" },
  { id: "d-02", time: "10:05", carrier: "gold", flight: "LH 454", codeshare: "UA 8829", destination: "San Francisco", terminal: "1", gate: "Z66", status: "Boarding" },
  { id: "d-03", time: "10:05", carrier: "gold", flight: "LH 1176", codeshare: "NH 6164", destination: "Porto", terminal: "1", gate: "A36", status: "Boarding" },
  { id: "d-04", time: "10:09", carrier: "gold", flight: "LH 400", codeshare: "UA 9600", destination: "New York/Newark", terminal: "1", gate: "Z50", status: "gate open" },
  { id: "d-05", time: "10:09", carrier: "gold", flight: "LH 710", codeshare: "UA 9692", destination: "Seoul/Incheon", terminal: "1", gate: "B48", status: "gate open" },
  { id: "d-06", time: "10:09", carrier: "gold", flight: "LH 498", codeshare: "UA 8856", destination: "Mexico City", terminal: "1", gate: "Z68", status: "Boarding" },
  { id: "d-07", time: "10:10", carrier: "gold", flight: "LH 1124", codeshare: "NH 5441", destination: "Barcelona", terminal: "1", gate: "A18", status: "gate open" },
  { id: "d-08", time: "10:15", carrier: "white", flight: "AA 705", codeshare: "", destination: "Charlotte", terminal: "2", gate: "D1", status: "Boarding" },
  { id: "d-09", time: "10:15", carrier: "gold", flight: "LH 1394", codeshare: "SQ 2094", destination: "Prague", terminal: "1", gate: "A26", status: "gate open" },
  { id: "d-10", time: "10:20", carrier: "gold", flight: "LH 1142", codeshare: "AC 9525", destination: "Bilbao", terminal: "1", gate: "A34", status: "gate open" },
  { id: "d-11", time: "10:24", carrier: "gold", flight: "LH 470", codeshare: "UA 8866", destination: "Toronto", terminal: "1", gate: "Z62", status: "gate open" },
  { id: "d-12", time: "10:25", carrier: "gold", flight: "LH 456", codeshare: "UA 8845", destination: "Los Angeles", terminal: "1", gate: "Z69", status: "gate open" },
  { id: "d-13", time: "10:25", carrier: "gold", flight: "LH 860", codeshare: "SQ 2130", destination: "Oslo-Gardermoen", terminal: "1", gate: "A28", status: "gate open" },
  { id: "d-14", time: "10:25", carrier: "gold", flight: "LH 1418", codeshare: "AC 9164", destination: "Bucharest", terminal: "1", gate: "B27", status: "gate open" },
  { id: "d-15", time: "10:25", carrier: "gold", flight: "LH 1420", codeshare: "UA 9122", destination: "Sofia", terminal: "1", gate: "A16", status: "gate open" },
  { id: "d-16", time: "10:35", carrier: "aqua", flight: "4Y 300", codeshare: "", destination: "Fuerteventura", terminal: "1", gate: "A52", status: "gate open" },
] as const satisfies readonly Departure[];

export function withEmbeddedLyric(
  lyric: readonly string[],
  revealedWordCount: number,
) {
  const lyricStart = Math.floor((departures.length - lyric.length) / 2);

  return departures.map((departure, index) => {
    const lyricIndex = index - lyricStart;
    const destination =
      lyricIndex >= 0 && lyricIndex < revealedWordCount
        ? lyric[lyricIndex]!
        : departure.destination;

    return { ...departure, destination };
  });
}
