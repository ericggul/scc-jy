import * as simpleIcons from "simple-icons";
import type { SimpleIcon } from "simple-icons";

const BRAND_COUNT = 2500;

const iconEntries = Object.values(
  simpleIcons as Record<string, SimpleIcon | undefined>,
)
  .filter((icon): icon is SimpleIcon => Boolean(icon?.slug && icon.path))
  .sort((a, b) =>
    a.title.localeCompare(b.title, "en", {
      numeric: true,
      sensitivity: "base",
    }),
  );

export type LogoCell = {
  id: string;
  name: string;
  slug: string;
  source: string;
  hex: string;
  path: string;
};

export const brandLogos = iconEntries
  .slice(0, BRAND_COUNT)
  .map((icon) => ({
    id: icon.slug,
    name: icon.title,
    slug: icon.slug,
    source: icon.source,
    hex: icon.hex,
    path: icon.path,
  })) satisfies readonly LogoCell[];

export const logoTableSize = {
  columns: 50,
  rows: 50,
  total: BRAND_COUNT,
} as const;
