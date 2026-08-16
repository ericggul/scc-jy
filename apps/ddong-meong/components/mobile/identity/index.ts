export type DdongMeongGreetingKind = "first-visit" | "returning";

const nicknameStorageKey = "ddong-meong:nickname";
const nicknameFallbackStorageKey = "ddong-meong:nickname:tab";
const greetingStorageKey = "ddong-meong:entry-greeting";
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

export function markDdongMeongEntry(kind: DdongMeongGreetingKind) {
  try {
    window.sessionStorage.setItem(greetingStorageKey, kind);
  } catch {
    // Greeting falls back to the returning form when session storage is unavailable.
  }
}

export function readDdongMeongGreeting() {
  const nickname = readSavedNickname();
  if (!nickname) return undefined;

  try {
    return {
      nickname,
      kind:
        window.sessionStorage.getItem(greetingStorageKey) === "first-visit"
          ? "first-visit"
          : "returning",
    } satisfies { nickname: string; kind: DdongMeongGreetingKind };
  } catch {
    return { nickname, kind: "returning" } satisfies {
      nickname: string;
      kind: DdongMeongGreetingKind;
    };
  }
}
