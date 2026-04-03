import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { messages, systemPrompt } = await req.json();

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
  });

  const result = streamText({
    model: openrouter.chat("google/gemini-2.5-pro"),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
