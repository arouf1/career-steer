import { auth } from "@clerk/nextjs/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { OPENROUTER_MODELS } from "@/lib/ai/openrouter-models";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorised", { status: 401 });
  }

  const body = (await req.json()) as {
    messages?: UIMessage[];
    systemPrompt?: string;
  };

  const { messages: uiMessages, systemPrompt } = body;

  if (!Array.isArray(uiMessages) || typeof systemPrompt !== "string") {
    return new Response("Bad Request", { status: 400 });
  }

  const modelMessages = await convertToModelMessages(
    uiMessages.map(({ id: _id, ...rest }) => rest),
  );

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
  });

  const result = await streamText({
    model: openrouter.chat(OPENROUTER_MODELS.flash),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
