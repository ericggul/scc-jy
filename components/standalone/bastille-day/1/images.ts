export type BastilleDayKeyword =
  | "Fête nationale — Paris"
  | "Défilé du 14 juillet"
  | "Révolution française"
  | "Prise de la Bastille"
  | "Vive la France";

type SourceImage = {
  keyword: BastilleDayKeyword;
  fileName: string;
};

const sources: SourceImage[] = [
  { keyword: "Fête nationale — Paris", fileName: "Bastille Day 2025.jpg" },
  { keyword: "Défilé du 14 juillet", fileName: "Anoj de la «Akademi TNI» post parado ĉe la Champs-Élysées 2.jpg" },
  { keyword: "Défilé du 14 juillet", fileName: "Anoj de la «Akademi TNI» post parado ĉe la Champs-Élysées.jpg" },
  { keyword: "Défilé du 14 juillet", fileName: "Francaj militistoj post parado ĉe la Champs-Élysées.jpg" },
  { keyword: "Défilé du 14 juillet", fileName: "Patrouille de France dum parado ĉe la Champs-Élysées.jpg" },
  { keyword: "Défilé du 14 juillet", fileName: "«Flottille de lutte contre les mines» post la parado ĉe la Champs-Élysées.jpg" },

  ...[
    "Défilé aérien du 14 juillet 2024, Paris 14.jpg",
    "Défilé aérien du 14 juillet 2024, Paris 01.jpg",
    "Défilé aérien du 14 juillet 2024, Paris 02.jpg",
    "Défilé aérien du 14 juillet 2024, Paris 10.jpg",
    "Défilé aérien du 14 juillet 2024, Paris 12.jpg",
    "Défilé aérien du 14 juillet 2024, Paris 11.jpg",
    "Défilé aérien du 14 juillet 2024, Paris 03.jpg",
    "Défilé aérien du 14 juillet 2024, Paris 15.jpg",
    "Défilé aérien du 14 juillet 2024, Paris 13.jpg",
    "Défilé aérien du 14 juillet 2024, Paris 05.jpg",
    "Défilé du 14 juillet 2024 pour les élèves de l'Ecole polytechnique promotion X23 (53856750662).jpg",
    "Défilé du 14 juillet 2024 pour les élèves de l'Ecole polytechnique promotion X23 (53856750897).jpg",
    "Défilé du 14 juillet 2024 pour les élèves de l'Ecole polytechnique promotion X23 (53856750917).jpg",
    "Défilé du 14 juillet 2024 pour les élèves de l'Ecole polytechnique promotion X23 (53856751057).jpg",
    "Défilé du 14 juillet 2024 pour les élèves de l'Ecole polytechnique promotion X23 (53856751177).jpg",
    "Défilé du 14 juillet 2024 pour les élèves de l'Ecole polytechnique promotion X23 (53856751427).jpg",
    "Défilé du 14 juillet 2024 pour les élèves de l'Ecole polytechnique promotion X23 (53856751657).jpg",
    "Défilé du 14 juillet 2024 pour les élèves de l'Ecole polytechnique promotion X23 (53857646311).jpg",
    "Défilé du 14 juillet 2024 pour les élèves de l'Ecole polytechnique promotion X23 (53857646521).jpg",
    "Airbus Helicopters H160 - F-WWOS 14 juillet 2023 (1).jpg",
    "Airbus Helicopters H160 - F-WWOS 14 juillet 2023 (2).jpg",
    "Airbus Helicopters H160 - F-WWOS 14 juillet 2023 (3).jpg",
    "Armée de l'air - Peugeot P4 (14 juillet 2023).jpg",
    "Armée de l'air - Sidex S3X (14 juillet 2023).jpg",
    "Armée de terre - EBRC Jaguar - 1 (14 juillet 2023).jpg",
    "Armée de terre - EBRC Jaguar - 2 (14 juillet 2023).jpg",
    "Armée de terre - GBC 180 (14 juillet 2023).jpg",
  ].map((fileName) => ({ keyword: "Défilé du 14 juillet" as const, fileName })),

  ...[
    "Storming the bastille 4.jpg",
    "Henry Singleton - Prise de la Bastille.jpg",
    "Henry Singleton the Storming of the Bastille.jpg",
    "Prise de la Bastille clean.jpg",
    "Représentant en mission (musée de la Révolution française).jpg",
    "Prise de la storming of the Bastille 14 july 1789.jpg",
    "Storming the bastille 4 - 1.jpg",
    "Storming the bastille 4 - 2.jpg",
    "The storming of the Bastille on the 14 July 1789. Line engra Wellcome V0041874.jpg",
    "An Incident in the French Revolution (Walter William Ouless).jpg",
    "Valmy Battle painting.jpg",
    "1791 painting of the princesse de Lamballe during the French Revolution attributed to Danloux.jpg",
    "11-french revolution 1789.jpg",
    "Révolution de France dell Année 1789FXD.jpg",
    "Valentine Cameron Prinsep (1838-1904) - To Versailles, an Incident in the French Revolution - VIS.1610 - Sheffield Galleries and Museums Trust.jpg",
    "French Revolution.jpg",
    "French Revolution revolutionary uniform.jpg",
  ].map((fileName) => ({ keyword: "Révolution française" as const, fileName })),

  ...[
    "Dorothy Dalton in Vive la France.jpg",
    "Vive La France poster.jpg",
    "Vive-la-france-raphael-kirchner.jpg",
    "Edouard Detaille - Vive L'Empereur - Google Art Project.jpg",
    "Vive la grève.JPG",
    "La Carga \"¡Vive la France!\".jpg",
    "Vive La France^ - geograph.org.uk - 2441516.jpg",
    "Fliesenmuseum - Vive la France 07 - Aug. 2022.jpg",
    "Fliesenmuseum - Vive la France 05 - Aug. 2022.jpg",
    "Fliesenmuseum - Vive la France 09 - Aug. 2022.jpg",
  ].map((fileName) => ({ keyword: "Vive la France" as const, fileName })),
];

export const bastilleDayImages = sources.map((source, index) => {
  const encodedFileName = encodeURIComponent(source.fileName);
  const localFileNumber = String(index + 1).padStart(2, "0");

  return {
    id: `bastille-day-${index + 1}`,
    keyword: source.keyword,
    title: source.fileName.replace(/\.[^.]+$/, ""),
    imageUrl: `/images/bastille-day/${localFileNumber}.jpg`,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodedFileName}`,
  };
});
