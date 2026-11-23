import { isSameOrigin, jsonError, openAiConfig, openAiFetch } from "@/lib/openai-server";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const { apiKey, transcribeModel } = openAiConfig();
  if (!apiKey) return jsonError(503, "OpenAI voice is not configured.");
  if (!isSameOrigin(request)) return jsonError(403, "Forbidden.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Expected form data.");
  }
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return jsonError(400, "Audio is missing.");
  if (audio.size > MAX_BYTES) return jsonError(413, "Recording is too long.");

  const upstreamForm = new FormData();
  upstreamForm.append("file", audio, audio.name || "answer.webm");
  upstreamForm.append("model", transcribeModel);
  upstreamForm.append("language", "fr");
  upstreamForm.append("response_format", "json");

  const upstream = await openAiFetch("/audio/transcriptions", apiKey, { method: "POST", body: upstreamForm });
  if (!upstream.ok) {
    console.error("OpenAI transcription failed", upstream.status, await upstream.text().catch(() => ""));
    return jsonError(502, "Transcription failed.");
  }

  const result = (await upstream.json()) as { text?: string };
  return Response.json({ text: (result.text ?? "").trim() });
}
