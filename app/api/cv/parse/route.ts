import { auth } from "@clerk/nextjs/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { OPENROUTER_MODELS } from "@/lib/ai/openrouter-models";
import { cvExtractionSchema } from "@/lib/ai/schemas";
import { buildCvExtractionPrompt } from "@/lib/ai/prompts";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  if (file.type === "application/pdf") {
    const { getDocumentProxy, extractText } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }

  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(arrayBuffer),
  });
  return result.value;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json(
      { error: "Request must be multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: "Only PDF and DOCX files are accepted" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File must be under 5 MB" },
      { status: 400 },
    );
  }

  let cvText: string;
  try {
    cvText = await extractTextFromFile(file);
  } catch {
    return Response.json(
      { error: "Could not read the file. Please check it is a valid PDF or DOCX." },
      { status: 422 },
    );
  }

  if (cvText.trim().length < 50) {
    return Response.json(
      { error: "The file appears to contain very little text. Please upload a different CV." },
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
      prompt: buildCvExtractionPrompt(cvText),
    });

    return Response.json({ profile });
  } catch {
    return Response.json(
      { error: "Failed to analyse the CV. Please try again." },
      { status: 500 },
    );
  }
}
