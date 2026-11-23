import { openAiConfig } from "@/lib/openai-server";

export const dynamic = "force-dynamic";

/** Tells the client whether OpenAI voice is configured, without exposing the key. */
export function GET() {
  return Response.json({ enabled: Boolean(openAiConfig().apiKey) });
}
