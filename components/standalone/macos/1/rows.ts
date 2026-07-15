import {
  appleMenuEntries,
  createBrandMenuEntries,
  createStandardMenuDefinitions,
  type MenuDefinition,
} from "./menu-data";

const rowAssignments = [
  { id: "jeffrey-epstein", brand: "Epstein" },
  { id: "stephen-hawking", brand: "Hawking" },
  { id: "bill-clinton", brand: "Clinton" },
  { id: "donald-trump", brand: "Trump" },
  { id: "prince-andrew", brand: "Andrew" },
  { id: "michael-jackson", brand: "Jackson" },
  { id: "david-copperfield", brand: "Copperfield" },
  { id: "leonardo-dicaprio", brand: "DiCaprio" },
  { id: "cate-blanchett", brand: "Blanchett" },
  { id: "cameron-diaz", brand: "Diaz" },
  { id: "bruce-willis", brand: "Willis" },
  { id: "kevin-spacey", brand: "Spacey" },
  { id: "naomi-campbell", brand: "Campbell" },
  { id: "elon-musk", brand: "Musk" },
  { id: "bill-gates", brand: "Gates" },
  { id: "noam-chomsky", brand: "Chomsky" },
  { id: "richard-branson", brand: "Branson" },
  { id: "sergey-brin", brand: "Brin" },
  { id: "sarah-ferguson", brand: "Ferguson" },
  { id: "alan-dershowitz", brand: "Dershowitz" },
  { id: "larry-summers", brand: "Summers" },
  { id: "les-wexner", brand: "Wexner" },
  { id: "glenn-dubin", brand: "Dubin" },
  { id: "eva-andersson-dubin", brand: "Andersson-Dubin" },
  { id: "bill-richardson", brand: "Richardson" },
  { id: "ehud-barak", brand: "Barak" },
  { id: "mick-jagger", brand: "Jagger" },
  { id: "diana-ross", brand: "Ross" },
  { id: "chris-tucker", brand: "Tucker" },
  { id: "woody-allen", brand: "Allen" },
  { id: "david-blaine", brand: "Blaine" },
  { id: "walter-cronkite", brand: "Cronkite" },
  { id: "steve-bannon", brand: "Bannon" },
  { id: "martha-stewart", brand: "Stewart" },
  { id: "howard-lutnick", brand: "Lutnick" },
  { id: "melania-trump", brand: "Trump" },
  { id: "jes-staley", brand: "Staley" },
  { id: "peter-mandelson", brand: "Mandelson" },
  { id: "peter-attia", brand: "Attia" },
  { id: "borge-brende", brand: "Brende" },
  { id: "mette-marit", brand: "Mette-Marit" },
  { id: "ariane-de-rothschild", brand: "Rothschild" },
  { id: "thomas-pritzker", brand: "Pritzker" },
  { id: "steve-tisch", brand: "Tisch" },
  { id: "kevin-warsh", brand: "Warsh" },
  { id: "frederic-fekkai", brand: "Fekkai" },
] as const;

export type MacosSloganRow = {
  id: string;
  brand: string;
  menus: readonly MenuDefinition[];
  status: {
    batteryPercent: number;
    charging: boolean;
    wifiLevel: 0 | 1 | 2 | 3;
  };
};

export const macosSloganRows: readonly MacosSloganRow[] = rowAssignments.map(
  (assignment) => {
    const menus: readonly MenuDefinition[] = [
      {
        id: `${assignment.id}-apple`,
        label: "Apple",
        entries: appleMenuEntries,
      },
      {
        id: `${assignment.id}-brand`,
        label: assignment.brand,
        entries: createBrandMenuEntries(assignment.id, assignment.brand),
      },
      ...createStandardMenuDefinitions(assignment.id),
    ];

    return {
      ...assignment,
      menus,
      status: {
        batteryPercent: 82,
        charging: false,
        wifiLevel: 3,
      },
    };
  },
);
