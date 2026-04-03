import { auth } from "@clerk/nextjs/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorised", { status: 401 });
  }

  const { messages, systemPrompt } = await req.json();

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
  });

  const result = await streamText({
    model: openrouter.chat("google/gemini-2.5-flash"),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
