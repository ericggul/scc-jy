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

export const departuresPerColumn = 24;

export const departures = [
  { id: "d-01", time: "10:05", carrier: "red", flight: "AC 845", codeshare: "SN 9680", destination: "Montreal", terminal: "1", gate: "B42", status: "Boarding" },
  { id: "d-02", time: "10:05", carrier: "gold", flight: "LH 454", codeshare: "UA 8829", destination: "San Francisco", terminal: "1", gate: "Z66", status: "Boarding" },
  { id: "d-03", time: "10:05", carrier: "gold", flight: "LH 1176", codeshare: "NH 6164", destination: "Porto", terminal: "1", gate: "A36", status: "Boarding" },
  { id: "d-04", time: "10:09", carrier: "gold", flight: "LH 400", codeshare: "UA 9600", destination: "New York/Newark", terminal: "1", gate: "Z50", status: "gate open" },
  { id: "d-05", time: "10:09", carrier: "gold", flight: "LH 710", codeshare: "UA 9692", destination: "Seoul/Incheon", terminal: "1", gate: "B48", status: "gate open" },
  { id: "d-06", time: "10:09", carrier: "gold", flight: "LH 498", codeshare: "UA 8856", destination: "Mexico City", terminal: "1", gate: "Z68", status: "Boarding" },
  { id: "d-07", time: "10:10", carrier: "gold", flight: "LH 1124", codeshare: "NH 5441", destination: "Barcelona", terminal: "1", gate: "A18", status: "gate open" },
  { id: "d-08", time: "10:15", carrier: "white", flight: "AA 705", codeshare: "BA 1511", destination: "Charlotte", terminal: "2", gate: "D1", status: "Boarding" },
  { id: "d-09", time: "10:15", carrier: "gold", flight: "LH 1394", codeshare: "SQ 2094", destination: "Prague", terminal: "1", gate: "A26", status: "gate open" },
  { id: "d-10", time: "10:20", carrier: "gold", flight: "LH 1142", codeshare: "AC 9525", destination: "Bilbao", terminal: "1", gate: "A34", status: "gate open" },
  { id: "d-11", time: "10:24", carrier: "gold", flight: "LH 470", codeshare: "UA 8866", destination: "Toronto", terminal: "1", gate: "Z62", status: "gate open" },
  { id: "d-12", time: "10:25", carrier: "gold", flight: "LH 456", codeshare: "UA 8845", destination: "Los Angeles", terminal: "1", gate: "Z69", status: "gate open" },
  { id: "d-13", time: "10:25", carrier: "gold", flight: "LH 860", codeshare: "SQ 2130", destination: "Oslo-Gardermoen", terminal: "1", gate: "A28", status: "gate open" },
  { id: "d-14", time: "10:25", carrier: "gold", flight: "LH 1418", codeshare: "AC 9164", destination: "Bucharest", terminal: "1", gate: "B27", status: "gate open" },
  { id: "d-15", time: "10:25", carrier: "gold", flight: "LH 1420", codeshare: "UA 9122", destination: "Sofia", terminal: "1", gate: "A16", status: "gate open" },
  { id: "d-16", time: "10:35", carrier: "aqua", flight: "4Y 300", codeshare: "DE 6300", destination: "Fuerteventura", terminal: "1", gate: "A52", status: "Boarding" },
  { id: "d-17", time: "10:40", carrier: "gold", flight: "LH 1182", codeshare: "TP 6702", destination: "Lisbon", terminal: "1", gate: "A42", status: "gate open" },
  { id: "d-18", time: "10:45", carrier: "gold", flight: "LH 440", codeshare: "UA 8860", destination: "Houston", terminal: "1", gate: "Z56", status: "Boarding" },
  { id: "d-19", time: "10:50", carrier: "gold", flight: "LH 500", codeshare: "JJ 8071", destination: "Rio de Janeiro", terminal: "1", gate: "Z64", status: "gate open" },
  { id: "d-20", time: "10:55", carrier: "gold", flight: "LH 1212", codeshare: "LX 4106", destination: "Geneva", terminal: "1", gate: "A14", status: "gate open" },
  { id: "d-21", time: "11:00", carrier: "gold", flight: "LH 760", codeshare: "AI 8872", destination: "Delhi", terminal: "1", gate: "B46", status: "Boarding" },
  { id: "d-22", time: "11:05", carrier: "gold", flight: "LH 478", codeshare: "UA 8868", destination: "Vancouver", terminal: "1", gate: "Z60", status: "gate open" },
  { id: "d-23", time: "11:10", carrier: "gold", flight: "LH 100", codeshare: "BA 9200", destination: "London/Heathrow", terminal: "1", gate: "A24", status: "gate open" },
  { id: "d-24", time: "11:15", carrier: "gold", flight: "LH 982", codeshare: "LO 4902", destination: "Warsaw", terminal: "1", gate: "B16", status: "Boarding" },
  { id: "d-25", time: "11:20", carrier: "white", flight: "AF 1019", codeshare: "DL 8465", destination: "Paris/Charles de Gaulle", terminal: "2", gate: "D24", status: "Boarding" },
  { id: "d-26", time: "11:20", carrier: "aqua", flight: "KL 1822", codeshare: "AM 6241", destination: "Amsterdam", terminal: "2", gate: "D18", status: "gate open" },
  { id: "d-27", time: "11:25", carrier: "gold", flight: "LH 1114", codeshare: "IB 8783", destination: "Madrid", terminal: "1", gate: "A38", status: "gate open" },
  { id: "d-28", time: "11:25", carrier: "gold", flight: "LH 740", codeshare: "NH 5850", destination: "Osaka/Kansai", terminal: "1", gate: "B44", status: "Boarding" },
  { id: "d-29", time: "11:30", carrier: "gold", flight: "LH 720", codeshare: "CA 6222", destination: "Beijing", terminal: "1", gate: "B50", status: "gate open" },
  { id: "d-30", time: "11:30", carrier: "gold", flight: "LH 630", codeshare: "EK 6074", destination: "Dubai", terminal: "1", gate: "B30", status: "Boarding" },
  { id: "d-31", time: "11:35", carrier: "gold", flight: "LH 414", codeshare: "UA 9608", destination: "Washington/Dulles", terminal: "1", gate: "Z52", status: "gate open" },
  { id: "d-32", time: "11:40", carrier: "gold", flight: "LH 756", codeshare: "AI 8876", destination: "Mumbai", terminal: "1", gate: "B40", status: "Boarding" },
  { id: "d-33", time: "11:45", carrier: "gold", flight: "LH 584", codeshare: "SA 7426", destination: "Johannesburg", terminal: "1", gate: "Z58", status: "gate open" },
  { id: "d-34", time: "11:45", carrier: "gold", flight: "LH 1170", codeshare: "AZ 7081", destination: "Rome/Fiumicino", terminal: "1", gate: "A40", status: "gate open" },
  { id: "d-35", time: "11:50", carrier: "gold", flight: "LH 820", codeshare: "SK 3628", destination: "Copenhagen", terminal: "1", gate: "A12", status: "gate open" },
  { id: "d-36", time: "11:55", carrier: "gold", flight: "LH 1442", codeshare: "OU 5465", destination: "Zagreb", terminal: "1", gate: "A22", status: "Boarding" },
  { id: "d-37", time: "12:00", carrier: "gold", flight: "LH 1404", codeshare: "RO 9234", destination: "Bucharest", terminal: "1", gate: "A20", status: "gate open" },
  { id: "d-38", time: "12:05", carrier: "gold", flight: "LH 124", codeshare: "BA 9208", destination: "London/Heathrow", terminal: "1", gate: "A30", status: "gate open" },
  { id: "d-39", time: "12:10", carrier: "gold", flight: "LH 996", codeshare: "BT 6496", destination: "Riga", terminal: "1", gate: "A28", status: "Boarding" },
  { id: "d-40", time: "12:15", carrier: "gold", flight: "LH 804", codeshare: "SK 3614", destination: "Stockholm/Arlanda", terminal: "1", gate: "A32", status: "gate open" },
  { id: "d-41", time: "12:20", carrier: "gold", flight: "LH 1390", codeshare: "LX 4722", destination: "Prague", terminal: "1", gate: "A36", status: "gate open" },
  { id: "d-42", time: "12:25", carrier: "gold", flight: "LH 1496", codeshare: "LO 4962", destination: "Wroclaw", terminal: "1", gate: "A18", status: "Boarding" },
  { id: "d-43", time: "12:30", carrier: "gold", flight: "LH 778", codeshare: "SQ 3276", destination: "Singapore", terminal: "1", gate: "B52", status: "gate open" },
  { id: "d-44", time: "12:35", carrier: "gold", flight: "LH 796", codeshare: "CX 6720", destination: "Hong Kong", terminal: "1", gate: "B54", status: "Boarding" },
  { id: "d-45", time: "12:40", carrier: "gold", flight: "LH 716", codeshare: "BR 8722", destination: "Tokyo/Haneda", terminal: "1", gate: "B48", status: "gate open" },
  { id: "d-46", time: "12:45", carrier: "gold", flight: "LH 506", codeshare: "UA 8862", destination: "Sao Paulo", terminal: "1", gate: "Z66", status: "Boarding" },
  { id: "d-47", time: "12:50", carrier: "gold", flight: "LH 431", codeshare: "UA 9602", destination: "Chicago/O'Hare", terminal: "1", gate: "Z54", status: "gate open" },
  { id: "d-48", time: "12:55", carrier: "gold", flight: "LH 441", codeshare: "UA 8864", destination: "Houston", terminal: "1", gate: "Z56", status: "Last call" },
] as const satisfies readonly Departure[];

export function withLyricDestinations(
  lyric: readonly string[],
) {
  if (lyric.length === 0) return departures;

  return departures.map((departure, index) => ({
    ...departure,
    destination: lyric[index % lyric.length]!,
  }));
}
