export const exhibitions = [
  ["Marcel Duchamp", "Through Aug 22"],
  ["Frida and Diego: The Last Dream", "Through Sep 12"],
  ["Pierre Huyghe: UUmwelt", "Through Nov 29"],
  ["Architects of Liberation: Modernism in Western Africa", "Through Jan 2"],
  ["American Folk Art: Revisiting Abby Aldrich Rockefeller", "Through Aug 9"],
  ["The Many Lives of the Nakagin Capsule Tower", "Last chance"],
] as const;

export const collection = [
  {
    title: "Vincent van Gogh",
    work: "The Starry Night",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
  },
  {
    title: "Henri Matisse",
    work: "Dance (I)",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/a/a8/Henri_Matisse%2C_1909%2C_La_danse_%28I%29%2C_Museum_of_Modern_Art%2C_New_York.jpg",
  },
  {
    title: "Piet Mondrian",
    work: "Broadway Boogie Woogie",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/3/30/Piet_Mondrian%2C_1942_-_Broadway_Boogie_Woogie.jpg",
  },
] as const;

export const events = [
  ["Family Story Time", "Workshop", "Lines, patterns, movement, and looking."],
  [
    "Duchamp Talks",
    "Lecture",
    "Artists and writers on chance-based systems.",
  ],
  [
    "Indigenous Nation",
    "Film",
    "Short films on land, identity, and colonization.",
  ],
] as const;

export const visitCards = [
  ["Your day at MoMA", "Tours, dining, shopping, audio, and maps."],
  ["Free Friday Nights", "Book timed entry for evening admission."],
  ["Design Store", "Objects for tables, shelves, desks, and gifts."],
] as const;
