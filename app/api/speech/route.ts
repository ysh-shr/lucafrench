import { isSameOrigin, jsonError, openAiConfig, openAiFetch } from "@/lib/openai-server";

const MAX_CHARS = 400;

export async function POST(request: Request) {
  const { apiKey, ttsModel, ttsVoice } = openAiConfig();
  if (!apiKey) return jsonError(503, "OpenAI voice is not configured.");
  if (!isSameOrigin(request)) return jsonError(403, "Forbidden.");

  let body: { text?: unknown; slow?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON.");
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_CHARS) return jsonError(400, "Text is missing or too long.");

  const pace = body.slow ? "very slowly and clearly" : "slowly and clearly";
  const upstream = await openAiFetch("/audio/speech", apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ttsModel,
      voice: ttsVoice,
      input: text,
      response_format: "mp3",
      instructions: `Speak in standard French from France, ${pace}, like a friendly teacher talking to a 12-year-old beginner.`,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    console.error("OpenAI speech failed", upstream.status, await upstream.text().catch(() => ""));
    return jsonError(502, "Speech generation failed.");
  }

  return new Response(upstream.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" },
  });
}
