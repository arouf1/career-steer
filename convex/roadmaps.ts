import { v } from "convex/values";
import { internalMutation, query, action } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const getByJourneyId = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const roadmaps = await ctx.db
      .query("roadmaps")
      .withIndex("by_journeyId", (q) => q.eq("journeyId", args.journeyId))
      .order("desc")
      .take(1);

    return roadmaps[0] ?? null;
  },
});

export const create = internalMutation({
  args: {
    journeyId: v.id("journeys"),
    overview: v.string(),
    durationWeeks: v.number(),
    milestones: v.array(
      v.object({
        weekNumber: v.number(),
        title: v.string(),
        description: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("roadmaps")
      .withIndex("by_journeyId", (q) => q.eq("journeyId", args.journeyId))
      .order("desc")
      .take(1);

    const version = existing.length > 0 ? existing[0].version + 1 : 1;

    return await ctx.db.insert("roadmaps", {
      journeyId: args.journeyId,
      generatedAt: Date.now(),
      version,
      overview: args.overview,
      durationWeeks: args.durationWeeks,
      milestones: args.milestones,
    });
  },
});

export const generateRoadmap = action({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args): Promise<string> => {
    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const { generateObject } = await import("ai");

    const journey = await ctx.runQuery(api.journeys.getById, {
      journeyId: args.journeyId,
    });
    if (!journey) throw new Error("Journey not found");

    const user = await ctx.runQuery(api.users.getById, {
      userId: journey.userId,
    });
    if (!user || !user.profile) throw new Error("User profile not found");

    const diagnostic = await ctx.runQuery(api.diagnostics.getById, {
      diagnosticId: journey.diagnosticId,
    });
    if (!diagnostic || !diagnostic.analysis)
      throw new Error("Diagnostic analysis not found");

    const { buildRoadmapPrompt } = await import("../lib/ai/prompts");
    const { roadmapGenerationSchema } = await import("../lib/ai/schemas");

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const { object } = await generateObject({
      model: openrouter.chat("google/gemini-2.5-pro"),
      schema: roadmapGenerationSchema,
      prompt: buildRoadmapPrompt({
        userName: user.name,
        lane: journey.lane,
        targetRole: journey.targetRole,
        strengths: diagnostic.analysis.topStrengths,
        blockers: diagnostic.analysis.keyBlockers,
        constraints: {
          hoursPerWeek: diagnostic.answers.constraints.hoursPerWeek,
          urgency: diagnostic.answers.constraints.urgency,
          willingnessToRetrain:
            diagnostic.answers.constraints.willingnessToRetrain,
        },
        suggestedRoles: diagnostic.analysis.suggestedRoles,
      }),
    });

    const roadmapId = await ctx.runMutation(internal.roadmaps.create, {
      journeyId: args.journeyId,
      overview: object.overview,
      durationWeeks: object.durationWeeks,
      milestones: object.milestones.map((m) => ({
        weekNumber: m.weekNumber,
        title: m.title,
        description: m.description,
      })),
    });

    for (const milestone of object.milestones) {
      for (let i = 0; i < milestone.steps.length; i++) {
        const step = milestone.steps[i];
        await ctx.runMutation(internal.steps.create, {
          roadmapId,
          journeyId: args.journeyId,
          weekNumber: milestone.weekNumber,
          order: i + 1,
          type: step.type,
          title: step.title,
          description: step.description,
          status: milestone.weekNumber === 1 ? "available" : "locked",
        });
      }
    }

    return roadmapId;
  },
});
