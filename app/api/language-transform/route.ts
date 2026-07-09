import {
  languageSlots,
  politicalSlots,
  type LanguageSlot,
  type PoliticalSlot,
  type TransformResponse,
  type TransformUsage,
} from "@/components/language/1/data";

const responseCache = new Map<string, TransformResponse>();
const maxCacheEntries = 120;
const defaultModel = "gpt-5-mini";
const debugPrefix = "[api/language-transform]";

function debugLog(label: string, data: unknown) {
  console.log(`${debugPrefix} ${label} ${JSON.stringify(data)}`);
}

type OpenAIUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

type OpenAIResponse = {
  output_text?: string;
  model?: string;
  usage?: OpenAIUsage;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

type LanguageTransformPayload = {
  text?: unknown;
  language?: unknown;
  political?: unknown;
};

function isLanguageSlot(value: unknown): value is LanguageSlot {
  return typeof value === "string" && languageSlots.includes(value as LanguageSlot);
}

function isPoliticalSlot(value: unknown): value is PoliticalSlot {
  return typeof value === "string" && politicalSlots.includes(value as PoliticalSlot);
}

function cacheKey(text: string, language: LanguageSlot, political: PoliticalSlot) {
  return JSON.stringify([text, language, political]);
}

function setCached(key: string, response: TransformResponse) {
  if (responseCache.size >= maxCacheEntries) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) {
      responseCache.delete(firstKey);
    }
  }

  responseCache.set(key, response);
}

function calculateUsage(usage?: OpenAIUsage): TransformUsage | null {
  if (!usage) {
    return null;
  }

  const inputTokens = usage.input_tokens ?? null;
  const outputTokens = usage.output_tokens ?? null;
  const totalTokens = usage.total_tokens ?? null;
  const inputRate = Number(process.env.OPENAI_INPUT_COST_PER_1M ?? "");
  const outputRate = Number(process.env.OPENAI_OUTPUT_COST_PER_1M ?? "");
  const canEstimate =
    Number.isFinite(inputRate) &&
    Number.isFinite(outputRate) &&
    inputTokens !== null &&
    outputTokens !== null;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: canEstimate
      ? (inputTokens / 1_000_000) * inputRate +
        (outputTokens / 1_000_000) * outputRate
      : null,
  };
}

function extractOutputText(response: OpenAIResponse) {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  return response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((text): text is string => typeof text === "string");
}

function parseTransformText(rawText: string) {
  try {
    const parsed = JSON.parse(rawText) as { text?: unknown };
    if (typeof parsed.text === "string") {
      return parsed.text.trim();
    }
  } catch {
    return rawText.trim();
  }

  return rawText.trim();
}

function createOpenAIBody(
  text: string,
  language: LanguageSlot,
  political: PoliticalSlot,
) {
  return {
    model: process.env.OPENAI_MODEL ?? defaultModel,
    input: [
      {
        role: "system",
        content:
          "Rewrite text for an interactive artwork. Compact JSON only. Be brief.",
      },
      {
        role: "user",
        content: [
          `Text: ${text}`,
          `Language: ${language}`,
          `Political stance: ${political}`,
          "Return {\"text\":\"...\"}. One short sentence. Translate to Language. If stance is not neutral-original, make tone visibly match stance without hate or harm.",
        ].join("\n"),
      },
    ],
    max_output_tokens: 60,
    text: {
      format: {
        type: "json_schema",
        name: "language_transform",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: { type: "string" },
          },
          required: ["text"],
        },
      },
    },
  };
}

async function callOpenAI(
  text: string,
  language: LanguageSlot,
  political: PoliticalSlot,
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    debugLog("missing-openai-api-key", {});
    return Response.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  debugLog("openai-request", {
    model: process.env.OPENAI_MODEL ?? defaultModel,
    language,
    political,
    textLength: text.length,
  });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createOpenAIBody(text, language, political)),
  });

  if (!response.ok) {
    const detail = await response.text();
    debugLog("openai-error", {
      status: response.status,
      detail,
    });
    return Response.json(
      { error: detail || "OpenAI request failed." },
      { status: response.status },
    );
  }

  const data = (await response.json()) as OpenAIResponse;
  const outputText = extractOutputText(data);

  if (!outputText) {
    debugLog("missing-output-text", data);
    return Response.json(
      { error: "OpenAI response did not include output text." },
      { status: 502 },
    );
  }

  const result: TransformResponse = {
    text: parseTransformText(outputText),
    model: data.model ?? process.env.OPENAI_MODEL ?? defaultModel,
    usage: calculateUsage(data.usage),
    cached: false,
  };

  debugLog("openai-success", {
    model: result.model,
    usage: result.usage,
    outputLength: result.text.length,
  });
  return result;
}

export async function POST(request: Request) {
  let payload: LanguageTransformPayload;

  try {
    payload = (await request.json()) as LanguageTransformPayload;
  } catch {
    debugLog("invalid-json", {});
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  debugLog("incoming", payload);

  if (typeof payload.text !== "string") {
    debugLog("invalid-text-type", { type: typeof payload.text });
    return Response.json({ error: "Text must be a string." }, { status: 400 });
  }

  const text = payload.text.trim();

  if (!text) {
    debugLog("empty-text", {});
    return Response.json({ error: "Text is required." }, { status: 400 });
  }

  if (!isLanguageSlot(payload.language) || !isPoliticalSlot(payload.political)) {
    debugLog("invalid-slots", {
      language: payload.language,
      political: payload.political,
    });
    return Response.json(
      { error: "Invalid language or political slot." },
      { status: 400 },
    );
  }

  const key = cacheKey(text, payload.language, payload.political);
  const cached = responseCache.get(key);

  if (cached) {
    debugLog("server-cache-hit", {
      language: payload.language,
      political: payload.political,
      textLength: text.length,
    });
    return Response.json({ ...cached, cached: true });
  }

  const result = await callOpenAI(text, payload.language, payload.political);

  if (result instanceof Response) {
    return result;
  }

  setCached(key, result);
  return Response.json(result);
}
