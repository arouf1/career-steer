"use server";

import { auth } from "@clerk/nextjs/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { OPENROUTER_MODELS } from "@/lib/ai/openrouter-models";
import { salaryBandsSchema } from "@/lib/ai/schemas";
import { buildSalaryBandsPrompt } from "@/lib/ai/prompts";

export async function generateSalaryBands(
  role: string,
  location: string,
  experienceLevel: string,
): Promise<{ currencySymbol: string; bands: string[] }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorised");

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
  });

  const { object } = await generateObject({
    model: openrouter.chat(OPENROUTER_MODELS.flashLite),
    schema: salaryBandsSchema,
    prompt: buildSalaryBandsPrompt(role, location, experienceLevel),
  });

  return object;
}
