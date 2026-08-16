"use client";

import { useEffect, useRef } from "react";

type DocumentPresenceOptions = {
  enabled: boolean;
  onHidden: () => void;
  onLeaving: () => void;
  onVisible: () => void;
};

export function useDocumentPresence({
  enabled,
  onHidden,
  onLeaving,
  onVisible,
}: DocumentPresenceOptions) {
  const callbacksRef = useRef({ onHidden, onLeaving, onVisible });

  useEffect(() => {
    callbacksRef.current = { onHidden, onLeaving, onVisible };
  }, [onHidden, onLeaving, onVisible]);

  useEffect(() => {
    if (!enabled) return;

    const reportVisibility = () => {
      if (document.visibilityState === "hidden") {
        callbacksRef.current.onHidden();
        return;
      }

      callbacksRef.current.onVisible();
    };

    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted) {
        callbacksRef.current.onHidden();
        return;
      }

      callbacksRef.current.onLeaving();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reportVisibility();
    };

    document.addEventListener("visibilitychange", reportVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    reportVisibility();

    return () => {
      document.removeEventListener("visibilitychange", reportVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [enabled]);
}
