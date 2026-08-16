export type DdongMeongEntryContext = {
  institution?: string;
  building?: string;
  floor?: string;
  gender?: string;
  attributes?: Record<string, string>;
};

export type DdongMeongEntryQuery = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

export const ddongMeongCampaignEntryContext = {
  institution: "kaist",
  building: "n25",
} satisfies DdongMeongEntryContext;

const standardFieldNames = [
  "institution",
  "building",
  "floor",
  "gender",
] as const;

type StandardFieldName = (typeof standardFieldNames)[number];

const queryAliases = {
  institution: ["institution", "organization", "org"],
  building: ["building"],
  floor: ["floor", "level"],
  gender: ["gender"],
} satisfies Record<StandardFieldName, readonly string[]>;

function cleanValue(value: unknown, maximumLength = 48) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
  return cleaned || undefined;
}

function cleanAttributeName(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return cleaned || undefined;
}

function readFirst(query: DdongMeongEntryQuery, names: readonly string[]) {
  for (const name of names) {
    const value = query[name];
    const first = Array.isArray(value) ? value[0] : value;
    const cleaned = cleanValue(first);
    if (cleaned) return cleaned;
  }
  return undefined;
}

function entryContextFromParts(
  values: Partial<Record<StandardFieldName, string | undefined>>,
  attributes: Record<string, string>,
): DdongMeongEntryContext {
  const context: DdongMeongEntryContext = {};

  standardFieldNames.forEach((field) => {
    const value = cleanValue(values[field]);
    if (value) context[field] = value;
  });

  if (Object.keys(attributes).length > 0) context.attributes = attributes;
  return context;
}

export function normalizeDdongMeongEntryContext(
  value: unknown,
): DdongMeongEntryContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const raw = value as Record<string, unknown>;
  const values: Partial<Record<StandardFieldName, string | undefined>> = {};
  standardFieldNames.forEach((field) => {
    values[field] = cleanValue(raw[field]);
  });

  const attributes: Record<string, string> = {};
  const rawAttributes = raw.attributes;
  if (rawAttributes && typeof rawAttributes === "object" && !Array.isArray(rawAttributes)) {
    Object.entries(rawAttributes)
      .slice(0, 12)
      .forEach(([key, attributeValue]) => {
        const normalizedKey = cleanAttributeName(key);
        const normalizedValue = cleanValue(attributeValue);
        if (normalizedKey && normalizedValue) {
          attributes[normalizedKey] = normalizedValue;
        }
      });
  }

  return entryContextFromParts(values, attributes);
}

export function isDdongMeongEntryContext(
  value: unknown,
): value is DdongMeongEntryContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const raw = value as Record<string, unknown>;
  if (
    standardFieldNames.some(
      (field) => raw[field] !== undefined && typeof raw[field] !== "string",
    )
  ) {
    return false;
  }

  if (raw.attributes === undefined) return true;
  if (
    !raw.attributes ||
    typeof raw.attributes !== "object" ||
    Array.isArray(raw.attributes)
  ) {
    return false;
  }

  return Object.entries(raw.attributes).every(
    ([key, attributeValue]) =>
      typeof key === "string" && typeof attributeValue === "string",
  );
}

export function entryContextFromQuery(
  query: DdongMeongEntryQuery,
): DdongMeongEntryContext {
  const values: Partial<Record<StandardFieldName, string | undefined>> = {};
  standardFieldNames.forEach((field) => {
    values[field] = readFirst(query, queryAliases[field]);
  });

  const compactLocation = readFirst(query, ["entry", "location", "place"]);
  if (compactLocation) {
    const compactParts = compactLocation
      .split("/")
      .map((part) => cleanValue(part))
      .filter((part): part is string => Boolean(part));
    standardFieldNames.forEach((field, index) => {
      values[field] ??= compactParts[index];
    });
  }

  const attributes: Record<string, string> = {};
  Object.entries(query).forEach(([rawKey, rawValue]) => {
    const attributeName = rawKey.match(/^(?:context|meta|attribute)[._-](.+)$/i)?.[1];
    const key = attributeName ? cleanAttributeName(attributeName) : undefined;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    const cleanedValue = cleanValue(value);
    if (key && cleanedValue) attributes[key] = cleanedValue;
  });

  return entryContextFromParts(values, attributes);
}

export function hasDdongMeongEntryContext(context: DdongMeongEntryContext) {
  return (
    standardFieldNames.some((field) => Boolean(context[field])) ||
    Boolean(context.attributes && Object.keys(context.attributes).length > 0)
  );
}

export function entryContextToQuery(
  context: DdongMeongEntryContext,
) {
  const normalized = normalizeDdongMeongEntryContext(context);
  const query = new URLSearchParams();

  standardFieldNames.forEach((field) => {
    const value = normalized[field];
    if (value) query.set(field, value);
  });
  Object.entries(normalized.attributes ?? {})
    .sort(([first], [second]) => first.localeCompare(second))
    .forEach(([key, value]) => query.set(`context.${key}`, value));

  return query.toString();
}
