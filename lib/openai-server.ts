// Server-only helpers for the OpenAI audio API. Only imported by route handlers,
// so the key never reaches the browser bundle.

const OPENAI_BASE = "https://api.openai.com/v1";

export function openAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return {
    apiKey: apiKey || null,
    ttsModel: process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
    ttsVoice: process.env.OPENAI_TTS_VOICE?.trim() || "coral",
    transcribeModel: process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-transcribe",
  };
}

export function openAiFetch(path: string, apiKey: string, init: RequestInit) {
  return fetch(`${OPENAI_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, ...init.headers },
  });
}

/** Rejects requests that don't come from this site, so the key can't be used from elsewhere. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}
