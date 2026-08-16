"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";

const measurementId = "G-N5RM30V2JJ";

function isLocalDevelopmentHost(hostname: string) {
  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    return true;
  }

  if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) {
    return true;
  }

  const privateRange = hostname.match(/^172\.(\d{1,3})\./);
  return Boolean(
    privateRange &&
      Number(privateRange[1]) >= 16 &&
      Number(privateRange[1]) <= 31,
  );
}

export default function GoogleAnalytics() {
  const enabled = useSyncExternalStore(
    () => () => undefined,
    () => !isLocalDevelopmentHost(window.location.hostname),
    () => false,
  );

  if (!enabled) return null;

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
var campaignParameters = new URLSearchParams(window.location.search);
var configuration = {
  page_location: window.location.origin + window.location.pathname,
  page_path: window.location.pathname,
};
var campaignSource = campaignParameters.get('utm_source');
var campaignMedium = campaignParameters.get('utm_medium');
var campaignName = campaignParameters.get('utm_campaign');
var campaignContent = campaignParameters.get('utm_content');
var campaignTerm = campaignParameters.get('utm_term');
if (campaignSource) configuration.campaign_source = campaignSource.slice(0, 100);
if (campaignMedium) configuration.campaign_medium = campaignMedium.slice(0, 100);
if (campaignName) configuration.campaign_name = campaignName.slice(0, 100);
if (campaignContent) configuration.campaign_content = campaignContent.slice(0, 100);
if (campaignTerm) configuration.campaign_term = campaignTerm.slice(0, 100);
gtag('config', '${measurementId}', configuration);`}
      </Script>
    </>
  );
}
