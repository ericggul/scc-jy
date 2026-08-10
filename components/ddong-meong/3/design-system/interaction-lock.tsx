"use client";

import { useEffect } from "react";

export default function InteractionLock() {
  useEffect(() => {
    function preventDefault(event: Event) {
      event.preventDefault();
    }

    function preventPinch(event: TouchEvent) {
      if (event.touches.length > 1) event.preventDefault();
    }

    function preventKeyboardZoom(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        ["+", "=", "-", "0"].includes(event.key)
      ) {
        event.preventDefault();
      }
    }

    document.addEventListener("dblclick", preventDefault, { passive: false });
    document.addEventListener("gesturestart", preventDefault, { passive: false });
    document.addEventListener("gesturechange", preventDefault, { passive: false });
    document.addEventListener("gestureend", preventDefault, { passive: false });
    document.addEventListener("touchmove", preventPinch, { passive: false });
    document.addEventListener("keydown", preventKeyboardZoom);

    return () => {
      document.removeEventListener("dblclick", preventDefault);
      document.removeEventListener("gesturestart", preventDefault);
      document.removeEventListener("gesturechange", preventDefault);
      document.removeEventListener("gestureend", preventDefault);
      document.removeEventListener("touchmove", preventPinch);
      document.removeEventListener("keydown", preventKeyboardZoom);
    };
  }, []);

  return null;
}
