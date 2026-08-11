import {
  hasDdongMeongEntryContext,
  normalizeDdongMeongEntryContext,
  type DdongMeongEntryContext,
} from "../../model/entry-context";

const entryContextStorageKey = "ddong-meong:4:entry-context";

export function storeDdongMeongEntryContext(context: DdongMeongEntryContext) {
  const normalized = normalizeDdongMeongEntryContext(context);

  try {
    if (hasDdongMeongEntryContext(normalized)) {
      window.sessionStorage.setItem(
        entryContextStorageKey,
        JSON.stringify(normalized),
      );
    } else {
      window.sessionStorage.removeItem(entryContextStorageKey);
    }
  } catch {
    // Location context is optional; a session can continue without browser storage.
  }

  return normalized;
}

export function readDdongMeongEntryContext() {
  try {
    const stored = window.sessionStorage.getItem(entryContextStorageKey);
    return stored ? normalizeDdongMeongEntryContext(JSON.parse(stored)) : {};
  } catch {
    return {};
  }
}
