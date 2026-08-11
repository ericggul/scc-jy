"use client";

import { useEffect } from "react";

export default function InteractionLock() {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootUserSelect = root.style.userSelect;
    const previousBodyUserSelect = body.style.userSelect;
    const previousRootTouchAction = root.style.touchAction;
    const previousBodyTouchAction = body.style.touchAction;

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

    root.style.userSelect = "none";
    body.style.userSelect = "none";
    root.style.touchAction = "none";
    body.style.touchAction = "none";
    document.addEventListener("dblclick", preventDefault, { passive: false });
    document.addEventListener("selectstart", preventDefault, { passive: false });
    document.addEventListener("gesturestart", preventDefault, { passive: false });
    document.addEventListener("gesturechange", preventDefault, { passive: false });
    document.addEventListener("gestureend", preventDefault, { passive: false });
    document.addEventListener("touchmove", preventPinch, { passive: false });
    document.addEventListener("keydown", preventKeyboardZoom);

    return () => {
      root.style.userSelect = previousRootUserSelect;
      body.style.userSelect = previousBodyUserSelect;
      root.style.touchAction = previousRootTouchAction;
      body.style.touchAction = previousBodyTouchAction;
      document.removeEventListener("dblclick", preventDefault);
      document.removeEventListener("selectstart", preventDefault);
      document.removeEventListener("gesturestart", preventDefault);
      document.removeEventListener("gesturechange", preventDefault);
      document.removeEventListener("gestureend", preventDefault);
      document.removeEventListener("touchmove", preventPinch);
      document.removeEventListener("keydown", preventKeyboardZoom);
    };
  }, []);

  return null;
}
