export type DdongMeongGreetingKind = "first-visit" | "returning";

const nicknameStorageKey = "ddong-meong:nickname";
const nicknameFallbackStorageKey = "ddong-meong:nickname:tab";
const greetingStorageKey = "ddong-meong:entry-greeting";
const visitCountStorageKey = "ddong-meong:visit-count";
const visitCountFallbackStorageKey = "ddong-meong:visit-count:tab";
const greetingVariantStorageKey = "ddong-meong:entry-greeting-variant";
const greetingVariantCount = 5;
const legacyNicknameStorageKey = "ddong-meong:4:nickname";
const legacyNicknameFallbackStorageKey = "ddong-meong:4:nickname:tab";

function cleanNickname(value: unknown) {
  if (typeof value !== "string") return undefined;
  const nickname = value.trim().replace(/\s+/g, " ").slice(0, 16);
  return nickname || undefined;
}

export function readSavedNickname() {
  try {
    return (
      cleanNickname(window.localStorage.getItem(nicknameStorageKey)) ??
      cleanNickname(window.sessionStorage.getItem(nicknameFallbackStorageKey)) ??
      cleanNickname(window.localStorage.getItem(legacyNicknameStorageKey)) ??
      cleanNickname(
        window.sessionStorage.getItem(legacyNicknameFallbackStorageKey),
      )
    );
  } catch {
    return undefined;
  }
}

export function saveNickname(value: string) {
  const nickname = cleanNickname(value);
  if (!nickname) return undefined;

  try {
    window.localStorage.setItem(nicknameStorageKey, nickname);
    window.sessionStorage.setItem(nicknameFallbackStorageKey, nickname);
  } catch {
    // The current tab can still continue when persistent storage is unavailable.
  }
  return nickname;
}

function readVisitCount() {
  try {
    const value =
      window.localStorage.getItem(visitCountStorageKey) ??
      window.sessionStorage.getItem(visitCountFallbackStorageKey);
    const count = Number.parseInt(value ?? "", 10);
    return Number.isSafeInteger(count) && count > 0 ? count : undefined;
  } catch {
    return undefined;
  }
}

function readGreetingVariant() {
  try {
    const variant = Number.parseInt(
      window.sessionStorage.getItem(greetingVariantStorageKey) ?? "",
      10,
    );
    return variant >= 0 && variant < greetingVariantCount ? variant : 0;
  } catch {
    return 0;
  }
}

export function markDdongMeongEntry(kind: DdongMeongGreetingKind) {
  try {
    window.sessionStorage.setItem(greetingStorageKey, kind);
    const visitCount =
      kind === "first-visit" ? 1 : Math.max(readVisitCount() ?? 1, 1) + 1;
    window.localStorage.setItem(visitCountStorageKey, String(visitCount));
    window.sessionStorage.setItem(
      visitCountFallbackStorageKey,
      String(visitCount),
    );

    if (visitCount >= 3) {
      window.sessionStorage.setItem(
        greetingVariantStorageKey,
        String(Math.floor(Math.random() * greetingVariantCount)),
      );
    } else {
      window.sessionStorage.removeItem(greetingVariantStorageKey);
    }
  } catch {
    // Stored identity and greetings are unavailable when browser storage is blocked.
  }
}

export function readDdongMeongGreeting() {
  const nickname = readSavedNickname();
  if (!nickname) return undefined;

  try {
    const kind =
      window.sessionStorage.getItem(greetingStorageKey) === "first-visit"
        ? "first-visit"
        : "returning";

    return {
      nickname,
      kind,
      visitCount: readVisitCount() ?? (kind === "first-visit" ? 1 : 2),
      greetingVariant: readGreetingVariant(),
    } satisfies {
      nickname: string;
      kind: DdongMeongGreetingKind;
      visitCount: number;
      greetingVariant: number;
    };
  } catch {
    return { nickname, kind: "returning", visitCount: 2, greetingVariant: 0 } satisfies {
      nickname: string;
      kind: DdongMeongGreetingKind;
      visitCount: number;
      greetingVariant: number;
    };
  }
}
