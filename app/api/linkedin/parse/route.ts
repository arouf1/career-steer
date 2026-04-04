import { auth } from "@clerk/nextjs/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import Exa from "exa-js";
import { OPENROUTER_MODELS } from "@/lib/ai/openrouter-models";
import { cvExtractionSchema } from "@/lib/ai/schemas";
import { buildLinkedInExtractionPrompt } from "@/lib/ai/prompts";

const LINKEDIN_PROFILE_PATTERN = /^https?:\/\/(\w+\.)?linkedin\.com\/in\//i;

function isLinkedInProfileUrl(url: string): boolean {
  try {
    new URL(url);
    return LINKEDIN_PROFILE_PATTERN.test(url);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Request must be JSON with a 'url' field" },
      { status: 400 },
    );
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return Response.json(
      { error: "A LinkedIn profile URL is required" },
      { status: 400 },
    );
  }

  if (!isLinkedInProfileUrl(url)) {
    return Response.json(
      { error: "Please provide a valid LinkedIn profile URL (e.g. https://linkedin.com/in/your-name)" },
      { status: 400 },
    );
  }

  let profileText: string;
  try {
    const exa = new Exa(process.env.EXA_API_KEY!);
    const result = await exa.getContents([url], {
      text: { maxCharacters: 10000 },
    });

    profileText = result.results[0]?.text ?? "";
  } catch {
    return Response.json(
      { error: "Could not fetch the LinkedIn profile. Please check the URL and try again." },
      { status: 422 },
    );
  }

  if (profileText.trim().length < 50) {
    return Response.json(
      {
        error:
          "Could not extract enough information from this profile. It may be private or have limited content.",
      },
      { status: 422 },
    );
  }

  try {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const { object: profile } = await generateObject({
      model: openrouter.chat(OPENROUTER_MODELS.flashLite),
      schema: cvExtractionSchema,
      prompt: buildLinkedInExtractionPrompt(profileText),
    });

    return Response.json({ profile });
  } catch {
    return Response.json(
      { error: "Failed to analyse the LinkedIn profile. Please try again." },
      { status: 500 },
    );
  }
}
