"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  languageSlots,
  politicalSlots,
  type TransformResponse,
} from "./data";
import GridOverlay from "./GridOverlay";
import MatrixText from "./MatrixText";
import { requestTransform, transformCacheKey } from "./api";
import { isOriginalTarget, quantizeAxis, slotCenter } from "./coordinates";
import { useModalityInput } from "./use-modality-input";

const debounceMs = 120;
const debugPrefix = "[language/1]";

function debugLog(label: string, data: unknown) {
  console.log(`${debugPrefix} ${label} ${JSON.stringify(data)}`);
}

export default function LanguageOne() {
  const gridRef = useRef<HTMLElement>(null);
  const coordinate = useModalityInput("mouse", gridRef);
  const languageIndex = quantizeAxis(coordinate.y);
  const politicalIndex = quantizeAxis(coordinate.x);
  const selectedCellKey = `${languageIndex}:${politicalIndex}`;
  const target = useMemo(
    () => ({
      coordinate: {
        x: slotCenter(politicalIndex),
        y: slotCenter(languageIndex),
      },
      languageIndex,
      politicalIndex,
      language: languageSlots[languageIndex],
      political: politicalSlots[politicalIndex],
    }),
    [languageIndex, politicalIndex],
  );
  const [inputText, setInputText] = useState("");
  const [remoteState, setRemoteState] = useState<{
    key: string | null;
    text: string;
    pending: boolean;
  }>({ key: null, text: "", pending: false });
  const [centerText, setCenterText] = useState("");
  const [responseCache, setResponseCache] = useState(
    () => new Map<string, TransformResponse>(),
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const latestActiveKeyRef = useRef<string | null>(null);
  const requestedKeyRef = useRef<string | null>(null);
  const trimmedText = inputText.trim();
  const cellKey = selectedCellKey;
  const isOriginal = !trimmedText || isOriginalTarget(target);
  const activeKey = useMemo(() => {
    if (isOriginal) {
      return null;
    }

    return transformCacheKey({
      text: trimmedText,
      language: target.language,
      political: target.political,
    });
  }, [isOriginal, target.language, target.political, trimmedText]);
  const cachedResponse = activeKey ? responseCache.get(activeKey) : undefined;
  const activeRemoteText =
    remoteState.key === activeKey && remoteState.text ? remoteState.text : "";
  const translatedText = isOriginal
    ? inputText
    : cachedResponse?.text || activeRemoteText || centerText || inputText;
  const isTransforming =
    Boolean(activeKey) &&
    !cachedResponse &&
    (remoteState.key !== activeKey ||
      remoteState.pending ||
      !remoteState.text);
  const matrixText = translatedText;

  useEffect(() => {
    latestActiveKeyRef.current = activeKey;
  }, [activeKey]);

  useEffect(() => {
    debugLog("target", {
      language: target.language,
      languageIndex: target.languageIndex,
      political: target.political,
      politicalIndex: target.politicalIndex,
      isOriginal,
      activeKey,
    });
  }, [
    activeKey,
    cellKey,
    isOriginal,
    target.language,
    target.languageIndex,
    target.political,
    target.politicalIndex,
  ]);

  useEffect(() => {
    debugLog("display", {
      inputText,
      translatedText,
      isTransforming,
      hasCachedResponse: Boolean(cachedResponse),
      remoteState,
    });
  }, [cachedResponse, inputText, isTransforming, remoteState, translatedText]);

  useEffect(() => {
    inputRef.current?.focus();
    debugLog("input-focus-requested", {});
  }, []);

  useEffect(() => {
    if (!activeKey || cachedResponse || requestedKeyRef.current === activeKey) {
      debugLog("request-skipped", {
        reason: !activeKey
          ? "original-or-empty"
          : cachedResponse
            ? "client-cache-hit"
            : "already-requested",
        activeKey,
      });
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      requestedKeyRef.current = activeKey;
      debugLog("request-start", {
        activeKey,
        text: trimmedText,
        language: target.language,
        political: target.political,
      });
      setRemoteState({ key: activeKey, text: "", pending: true });
      requestTransform({
        text: trimmedText,
        language: target.language,
        political: target.political,
        signal: controller.signal,
      })
        .then((response) => {
          debugLog("request-success", {
            activeKey,
            response,
          });
          setResponseCache((current) => {
            const next = new Map(current);
            if (next.size >= 120) {
              const firstKey = next.keys().next().value;
              if (firstKey) {
                next.delete(firstKey);
              }
            }

            next.set(activeKey, response);
            return next;
          });
          if (latestActiveKeyRef.current === activeKey) {
            setCenterText(response.text);
            setRemoteState({ key: activeKey, text: response.text, pending: false });
            requestedKeyRef.current = null;
          } else {
            debugLog("stale-response-ignored", {
              responseKey: activeKey,
              latestKey: latestActiveKeyRef.current,
            });
          }
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            debugLog("request-aborted", { activeKey });
            return;
          }

          const message =
            error instanceof Error ? error.message : "Transform request failed.";
          debugLog("request-error", {
            activeKey,
            message,
            error: error instanceof Error ? error.stack : String(error),
          });
          if (latestActiveKeyRef.current === activeKey) {
            setRemoteState({
              key: activeKey,
              text: `[transform error: ${message}]`,
              pending: false,
            });
            requestedKeyRef.current = null;
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setRemoteState((current) =>
              current.key === activeKey ? { ...current, pending: false } : current,
            );
          }
        });
    }, debounceMs);

    return () => {
      debugLog("request-cleanup", { activeKey });
      window.clearTimeout(timeout);
      controller.abort();
      if (requestedKeyRef.current === activeKey) {
        requestedKeyRef.current = null;
      }
    };
  }, [
    activeKey,
    cachedResponse,
    target.language,
    target.political,
    trimmedText,
  ]);

  return (
    <main
      ref={gridRef}
      className="relative grid h-dvh w-full cursor-none grid-rows-[minmax(96px,24dvh)_1fr_minmax(56px,14dvh)] overflow-hidden bg-white px-[clamp(20px,7vw,96px)] text-black"
      style={{
        fontFamily:
          "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
      onPointerDown={() => inputRef.current?.focus()}
    >
      <GridOverlay target={target} />
      <textarea
        ref={inputRef}
        aria-label="Sentence input"
        autoCapitalize="sentences"
        autoComplete="off"
        autoCorrect="off"
        className="absolute inset-0 z-10 h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-transparent opacity-[0.01] caret-transparent outline-none"
        spellCheck={false}
        value={inputText}
        onChange={(event) => {
          debugLog("input-change", { text: event.target.value });
          setInputText(event.target.value);
        }}
        onCompositionEnd={(event) => {
          debugLog("input-composition-end", { text: event.currentTarget.value });
          setInputText(event.currentTarget.value);
        }}
        onBlur={() => {
          debugLog("input-blurred-refocusing", {});
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
        autoFocus
      />
      <div className="pointer-events-none relative z-20 flex items-center justify-center overflow-hidden">
        <p className="max-w-[min(86vw,1120px)] whitespace-pre-wrap break-words text-center text-[clamp(18px,2.8vw,38px)] font-medium leading-[1.18] text-black">
          {inputText}
        </p>
      </div>
      <div
        aria-live="polite"
        className="pointer-events-none relative z-20 flex min-h-0 w-full items-center justify-center overflow-hidden"
      >
        <MatrixText
          active={isTransforming}
          animationKey={activeKey}
          loop={isTransforming}
          text={matrixText}
        />
      </div>
      <div aria-hidden="true" />
    </main>
  );
}
