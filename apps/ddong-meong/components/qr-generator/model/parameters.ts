import { siteUrl } from "@/app/seo";

export const qrPosterProjectIds = ["ddong-meong", "c-val"] as const;

export type QrPosterProject = (typeof qrPosterProjectIds)[number];

export const cValMobileEntryUrl = "https://c-val.vercel.app/mobile";

export type QrPosterParameters = {
  project: QrPosterProject;
  building: string;
};

export type QrPosterQuery = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

export const defaultQrPosterParameters = {
  project: "ddong-meong",
  building: "n25",
} satisfies QrPosterParameters;

function cleanValue(value: unknown, fallback: string, maximumLength: number) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
  return cleaned || fallback;
}

function readFirst(query: QrPosterQuery, name: string) {
  const value = query[name];
  return Array.isArray(value) ? value[0] : value;
}

function projectFromQuery(query: QrPosterQuery): QrPosterProject {
  const project = readFirst(query, "project");
  return project === "c-val" ? "c-val" : "ddong-meong";
}

export function qrPosterParametersFromQuery(
  query: QrPosterQuery,
): QrPosterParameters {
  return {
    project: projectFromQuery(query),
    building: cleanValue(
      readFirst(query, "building"),
      defaultQrPosterParameters.building,
      20,
    ),
  };
}

export function qrPosterParametersToQuery(parameters: QrPosterParameters) {
  const query = new URLSearchParams();
  if (parameters.project === "c-val") query.set("project", "c-val");
  query.set("building", parameters.building);
  return query.toString();
}

export function buildQrPosterEntryUrl(parameters: QrPosterParameters) {
  const entryQuery = new URLSearchParams();
  entryQuery.set("location", ["kaist", parameters.building].join("/"));
  return `${siteUrl}/?${entryQuery.toString()}`;
}
