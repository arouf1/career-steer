/**
 * OpenRouter model IDs (Google Gemini). Single source of truth for Next.js routes and Convex actions.
 */
export const OPENROUTER_MODELS = {
  /** Frontier reasoning: diagnostics, roadmaps, step generation */
  pro: "google/gemini-3.1-pro-preview",
  /** Interactive chat and multi-turn assistant */
  flash: "google/gemini-3-flash-preview",
  /** High-volume parsing, extraction, summaries */
  flashLite: "google/gemini-3.1-flash-lite-preview",
} as const;

export type OpenRouterModelKey = keyof typeof OPENROUTER_MODELS;
