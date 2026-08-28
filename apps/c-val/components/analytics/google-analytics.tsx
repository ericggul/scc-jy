"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const measurementId = "G-WR2VJSJLNF";
const configurationFlag = "__cValGoogleAnalyticsConfigured";

declare global {
  interface Window {
    [configurationFlag]?: boolean;
    dataLayer?: unknown[][];
    gtag?: (...arguments_: unknown[]) => void;
  }
}

function isLocalDevelopmentHost(hostname: string) {
  if (
    hostname === "localhost"
    || hostname === "::1"
    || hostname === "127.0.0.1"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
  ) {
    return true;
  }

  if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) {
    return true;
  }

  const privateRange = hostname.match(/^172\.(\d{1,3})\./);
  return Boolean(
    privateRange
    && Number(privateRange[1]) >= 16
    && Number(privateRange[1]) <= 31,
  );
}

function gtag() {
  window.dataLayer ??= [];
  window.gtag ??= (...arguments_: unknown[]) => {
    window.dataLayer?.push(arguments_);
  };
  return window.gtag;
}

function configureGoogleAnalytics() {
  const send = gtag();
  if (!window[configurationFlag]) {
    send("js", new Date());
    // Page views are sent explicitly below so client-side route changes receive
    // exactly one view rather than an automatic and a manual view.
    send("config", measurementId, { send_page_view: false });
    window[configurationFlag] = true;
  }
  return send;
}

/**
 * C-VAL's route-scoped Google tag. Import this only from public audience
 * pages: the artwork statement (`/`) and phone instrument (`/mobile`).
 */
export default function CValGoogleAnalytics() {
  const pathname = usePathname();
  const enabled = useSyncExternalStore(
    () => () => undefined,
    () => !isLocalDevelopmentHost(window.location.hostname),
    () => false,
  );

  useEffect(() => {
    if (!enabled) return;

    const send = configureGoogleAnalytics();
    send("event", "page_view", {
      page_location: window.location.href,
      page_path: `${pathname}${window.location.search}`,
      page_title: document.title,
    });
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <>
      <Script
        async
        id="c-val-google-analytics-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="c-val-google-analytics-bootstrap" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
if (!window.${configurationFlag}) {
  window.gtag('js', new Date());
  window.gtag('config', '${measurementId}', { send_page_view: false });
  window.${configurationFlag} = true;
}`}
      </Script>
    </>
  );
}
