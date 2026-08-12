type StandaloneApp = {
  developmentPort: string;
  environmentKey: "C_VAL_APP_URL" | "DDONG_MEONG_APP_URL";
  legacyPrefix: "/c-val" | "/ddong-meong";
  productionFallback: string;
};

export function standaloneAppUrl(request: Request, app: StandaloneApp) {
  const incoming = new URL(request.url);
  const configured = process.env[app.environmentKey]?.trim();
  const target = configured
    ? new URL(configured)
    : process.env.NODE_ENV === "production"
      ? new URL(app.productionFallback)
      : new URL(incoming);

  if (!configured && process.env.NODE_ENV !== "production") {
    target.port = app.developmentPort;
  }

  target.pathname = incoming.pathname.slice(app.legacyPrefix.length) || "/";
  target.search = incoming.search;
  target.hash = "";
  return target;
}
