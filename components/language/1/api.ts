"use client";

import type { LanguageSlot, PoliticalSlot, TransformResponse } from "./data";

export type ClientTransformRequest = {
  text: string;
  language: LanguageSlot;
  political: PoliticalSlot;
  signal?: AbortSignal;
};

export function transformCacheKey({
  text,
  language,
  political,
}: Omit<ClientTransformRequest, "signal">) {
  return JSON.stringify([text.trim(), language, political]);
}

export async function requestTransform({
  text,
  language,
  political,
  signal,
}: ClientTransformRequest): Promise<TransformResponse> {
  const response = await fetch("/api/language-transform", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, language, political }),
    signal,
  });

  const payload = (await response.json()) as Partial<TransformResponse> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Transform request failed.");
  }

  if (typeof payload.text !== "string") {
    throw new Error("Transform response did not include text.");
  }

  return {
    text: payload.text,
    model: payload.model ?? null,
    usage: payload.usage ?? null,
    cached: Boolean(payload.cached),
  };
}
