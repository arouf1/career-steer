import { v } from "convex/values";
import { OPENROUTER_MODELS } from "../lib/ai/openrouter-models";
import { query, internalMutation, action } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const getByJourneyAndWeek = query({
  args: {
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("progressLogs")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId).eq("weekNumber", args.weekNumber),
      )
      .unique();
  },
});

export const getAllByJourney = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("progressLogs")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId),
      )
      .collect();
  },
});

export const save = internalMutation({
  args: {
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
    stepsCompleted: v.number(),
    stepsTotal: v.number(),
    userReflection: v.union(v.string(), v.null()),
    blockers: v.union(v.string(), v.null()),
    encouragement: v.string(),
    updatedRecommendations: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("progressLogs")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId).eq("weekNumber", args.weekNumber),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        completedAt: Date.now(),
        stepsCompleted: args.stepsCompleted,
        stepsTotal: args.stepsTotal,
        userReflection: args.userReflection,
        blockers: args.blockers,
        encouragement: args.encouragement,
        updatedRecommendations: args.updatedRecommendations,
      });
      return existing._id;
    }

    return await ctx.db.insert("progressLogs", {
      journeyId: args.journeyId,
      weekNumber: args.weekNumber,
      completedAt: Date.now(),
      stepsCompleted: args.stepsCompleted,
      stepsTotal: args.stepsTotal,
      userReflection: args.userReflection,
      blockers: args.blockers,
      encouragement: args.encouragement,
      updatedRecommendations: args.updatedRecommendations,
    });
  },
});

export const generateCheckIn = action({
  args: {
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
    userReflection: v.union(v.string(), v.null()),
    blockers: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const { generateObject } = await import("ai");

    const journey = await ctx.runQuery(api.journeys.getById, {
      journeyId: args.journeyId,
    });
    if (!journey) throw new Error("Journey not found");

    const user = await ctx.runQuery(api.users.getById, {
      userId: journey.userId,
    });
    if (!user) throw new Error("User not found");

    const weekSteps = await ctx.runQuery(api.steps.getByJourneyAndWeek, {
      journeyId: args.journeyId,
      weekNumber: args.weekNumber,
    });

    const stepsCompleted = weekSteps.filter(
      (s: any) => s.status === "completed" || s.status === "skipped",
    ).length;
    const stepsTotal = weekSteps.length;

    const { buildCheckInPrompt } = await import("../lib/ai/prompts");
    const { checkInResponseSchema } = await import("../lib/ai/schemas");

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const { object } = await generateObject({
      model: openrouter.chat(OPENROUTER_MODELS.flashLite),
      schema: checkInResponseSchema,
      prompt: buildCheckInPrompt(
        user.name,
        journey.targetRole ?? "their next role",
        args.weekNumber,
        stepsCompleted,
        stepsTotal,
        args.userReflection,
        args.blockers,
      ),
    });

    await ctx.runMutation(internal.progressLogs.save, {
      journeyId: args.journeyId,
      weekNumber: args.weekNumber,
      stepsCompleted,
      stepsTotal,
      userReflection: args.userReflection,
      blockers: args.blockers,
      encouragement: object.encouragement,
      updatedRecommendations: object.updatedRecommendations,
    });

    const nextWeek = args.weekNumber + 1;
    await ctx.runMutation(internal.steps.unlockWeek, {
      journeyId: args.journeyId,
      weekNumber: nextWeek,
    });

    return object;
  },
});
