import type { InstagramStory } from "./types";

const profiles = [
  ["han.jiwon", "001"], ["miso.archive", "002"], ["yumi__o", "003"],
  ["haeun.k", "004"], ["siwoo.film", "005"], ["eunchae.jpg", "006"],
  ["leena.seo", "007"], ["noah.kim", "008"], ["yeoreum", "009"],
  ["dohee.cho", "010"], ["jinseoul", "011"], ["sora__lee", "012"],
  ["maeul.diary", "013"], ["haneulpark", "014"], ["riaonfilm", "015"],
  ["jaeonfilm", "016"], ["mina.park", "017"], ["bora.archive", "018"],
  ["do__not", "019"], ["aeri.lee", "020"], ["june.after", "021"],
  ["nari.zip", "022"], ["seoyeon.k", "023"], ["sori.cho", "024"],
  ["hyeon.zip", "025"], ["heejin.oh", "026"], ["nara.seo", "027"],
  ["mori.day", "028"], ["jisu.log", "029"], ["yoonsung", "030"],
  ["daniel.cho", "031"], ["hyunwoo.k", "032"], ["runa.park", "033"],
  ["sean.moon", "034"], ["sangmin.k", "035"], ["haru.park", "036"],
  ["soyoung.jpg", "037"], ["taehoon.choi", "038"], ["dami.works", "039"],
  ["juno.oh", "040"], ["solsol.day", "041"], ["eunwoo.zip", "042"],
  ["chaerin.seo", "043"], ["woon.archive", "044"], ["minji.jung", "045"],
  ["nolan.kim", "046"], ["doyeon.jpg", "047"], ["chae._.in", "048"],
  ["hoya.film", "049"], ["yoonah.day", "050"], ["momo.seoul", "051"],
  ["jimin.park", "052"], ["yeji.zip", "053"], ["sunny.cho", "054"],
  ["rua.archive", "055"], ["yoonji.lee", "056"],
] as const;

export const instagramStories: readonly InstagramStory[] = profiles.map(
  ([handle, portrait], index) => ({
    id: `profile-${String(index + 1).padStart(3, "0")}`,
    handle,
    profileImage: `/images/face-voronoi/portraits/${portrait}.jpg`,
  }),
);

/**
 * Returns exactly one stable record per visible grid position. Repeated
 * portraits retain a deterministic model-layer ID instead of using a label as
 * a React key.
 */
export function getInstagramGridStories(count: number): readonly InstagramStory[] {
  return Array.from({ length: count }, (_, index) => {
    const profile = instagramStories[index % instagramStories.length];
    const repeat = Math.floor(index / instagramStories.length) + 1;

    return {
      ...profile,
      id: `${profile.id}-grid-${repeat}`,
    };
  });
}
