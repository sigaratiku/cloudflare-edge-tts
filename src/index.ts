
import { handleHealth } from "./handlers/health";
import { handleTts } from "./handlers/tts";
import { handleTtsHealth } from "./handlers/tts-health";
import { handleVoices } from "./handlers/voices";
import {
  errorResponse,
  noContent,
  withCors,
} from "./lib/http";

async function routeRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (request.method === "OPTIONS") {
    return noContent();
  }

  if (pathname === "/health") {
    if (request.method !== "GET") {
      return errorResponse(
        405,
        "METHOD_NOT_ALLOWED",
        "method not allowed",
      );
    }
    return handleHealth();
  }

  if (pathname === "/health/tts") {
    if (request.method !== "GET") {
      return errorResponse(
        405,
        "METHOD_NOT_ALLOWED",
        "method not allowed",
      );
    }
    return handleTtsHealth(request);
  }

  if (pathname === "/voices") {
    if (request.method !== "GET") {
      return errorResponse(
        405,
        "METHOD_NOT_ALLOWED",
        "method not allowed",
      );
    }
    return handleVoices();
  }

  // Native Edge TTS endpoint
  if (pathname === "/tts") {
    if (request.method !== "POST") {
      return errorResponse(
        405,
        "METHOD_NOT_ALLOWED",
        "method not allowed",
      );
    }
    return handleTts(request);
  }

  // OpenAI-compatible endpoint
  if (pathname === "/v1/audio/speech") {
    if (request.method !== "POST") {
      return errorResponse(
        405,
        "METHOD_NOT_ALLOWED",
        "method not allowed",
      );
    }

    let payload: Record<string, unknown>;

    try {
      payload = await request.json() as Record<string, unknown>;
    } catch {
      return errorResponse(
        400,
        "INVALID_JSON",
        "request body must be valid JSON",
      );
    }

    // OpenAI uses "input"; native clients may use "text".
    const text =
      typeof payload.input === "string"
        ? payload.input
        : typeof payload.text === "string"
          ? payload.text
          : "";

    if (!text.trim()) {
      return errorResponse(
        400,
        "INVALID_TEXT",
        'provide a non-empty "input" or "text" field',
      );
    }

    // Accept a standard Edge voice name.
    // If omitted, the native handler uses its configured default.
    const voice =
      typeof payload.voice === "string"
        ? payload.voice
        : typeof payload.voiceId === "string"
          ? payload.voiceId
          : undefined;

    const ttsPayload: {
      text: string;
      voice?: string;
    } = { text };

    if (voice !== undefined && voice.trim() !== "") {
      ttsPayload.voice = voice;
    }

    const headers = new Headers(request.headers);
    headers.set("Content-Type", "application/json");

    // Reuse the working native synthesis handler.
    const ttsRequest = new Request(
      new URL("/tts", request.url).toString(),
      {
        method: "POST",
        headers,
        body: JSON.stringify(ttsPayload),
      },
    );

    return handleTts(ttsRequest);
  }

  return errorResponse(
    404,
    "NOT_FOUND",
    "route not found",
  );
}

export default {
  async fetch(
    request: Request,
    _env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    try {
      const response = await routeRequest(request);
      return withCors(response);
    } catch {
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "unexpected internal error",
      );
    }
  },
} satisfies ExportedHandler<Env>;
