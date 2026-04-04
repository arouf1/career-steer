import { v } from "convex/values";
import { OPENROUTER_MODELS } from "../lib/ai/openrouter-models";
import { internalAction, internalMutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";

const insightsValidator = v.object({
  skillDemand: v.array(
    v.object({
      skill: v.string(),
      frequency: v.number(),
      totalJobs: v.number(),
      importance: v.union(
        v.literal("critical"),
        v.literal("important"),
        v.literal("nice_to_have")
      ),
    })
  ),
  salaryAnalysis: v.object({
    lowestSeen: v.optional(v.string()),
    highestSeen: v.optional(v.string()),
    mostCommonRange: v.optional(v.string()),
    commentary: v.string(),
  }),
  industryClusters: v.array(
    v.object({
      category: v.string(),
      companies: v.array(v.string()),
      typicalRequirements: v.array(v.string()),
    })
  ),
  gapAlignment: v.array(
    v.object({
      skill: v.string(),
      userLevel: v.union(
        v.literal("strong"),
        v.literal("partial"),
        v.literal("gap"),
        v.literal("unknown")
      ),
      marketDemand: v.number(),
      commentary: v.string(),
    })
  ),
  keyPatterns: v.array(v.string()),
  overallNarrative: v.string(),
});

export const generate = internalAction({
  args: {
    jobSearchId: v.id("jobSearches"),
    journeyId: v.id("journeys"),
  },
  handler: async (ctx, args) => {
    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const { generateObject } = await import("ai");

    const jobSearch = await ctx.runQuery(api.jobSearches.getLatest, {
      journeyId: args.journeyId,
    });
    if (!jobSearch || jobSearch.jobs.length === 0) return;

    const journey = await ctx.runQuery(api.journeys.getById, {
      journeyId: args.journeyId,
    });
    if (!journey) throw new Error("Journey not found");

    const diagnostic = await ctx.runQuery(api.diagnostics.getById, {
      diagnosticId: journey.diagnosticId,
    });

    const { buildJobInsightsPrompt } = await import("../lib/ai/prompts");
    const { jobInsightsSchema } = await import("../lib/ai/schemas");

    const userSkills =
      diagnostic?.analysis?.pathMapData
        ?.find((p) => p.targetRole === journey.targetRole)
        ?.bridgeSkills ?? [];

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const { object } = await generateObject({
      model: openrouter.chat(OPENROUTER_MODELS.flash),
      schema: jobInsightsSchema,
      prompt: buildJobInsightsPrompt(
        jobSearch.jobs,
        userSkills,
        journey.targetRole ?? "Unknown"
      ),
    });

    await ctx.runMutation(internal.jobInsights.saveInsights, {
      jobSearchId: args.jobSearchId,
      journeyId: args.journeyId,
      insights: object,
    });
  },
});

export const saveInsights = internalMutation({
  args: {
    jobSearchId: v.id("jobSearches"),
    journeyId: v.id("journeys"),
    insights: insightsValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("jobInsights", {
      jobSearchId: args.jobSearchId,
      journeyId: args.journeyId,
      generatedAt: Date.now(),
      insights: args.insights,
    });
  },
});

export const getBySearchId = query({
  args: { jobSearchId: v.id("jobSearches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobInsights")
      .withIndex("by_jobSearchId", (q) =>
        q.eq("jobSearchId", args.jobSearchId)
      )
      .order("desc")
      .take(1)
      .then((results) => results[0] ?? null);
  },
});
