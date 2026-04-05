import { v } from "convex/values";
import { OPENROUTER_MODELS } from "../lib/ai/openrouter-models";
import { mutation, internalMutation, query, action } from "./_generated/server";
import { internal } from "./_generated/api";

export const getByStep = query({
  args: { stepId: v.id("steps") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stepEntries")
      .withIndex("by_stepId", (q) => q.eq("stepId", args.stepId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    stepId: v.id("steps"),
    journeyId: v.id("journeys"),
    taskIndex: v.number(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stepEntries")
      .withIndex("by_stepId_and_taskIndex", (q) =>
        q.eq("stepId", args.stepId).eq("taskIndex", args.taskIndex),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("stepEntries", {
      stepId: args.stepId,
      journeyId: args.journeyId,
      taskIndex: args.taskIndex,
      content: args.content,
      updatedAt: Date.now(),
    });
  },
});

export const setGrade = internalMutation({
  args: {
    stepId: v.id("steps"),
    taskIndex: v.number(),
    grade: v.object({
      letter: v.string(),
      summary: v.string(),
      strengths: v.array(v.string()),
      improvements: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("stepEntries")
      .withIndex("by_stepId_and_taskIndex", (q) =>
        q.eq("stepId", args.stepId).eq("taskIndex", args.taskIndex),
      )
      .unique();

    if (!entry) return;
    await ctx.db.patch(entry._id, { grade: args.grade });
  },
});

export const gradeEntry = action({
  args: {
    stepId: v.id("steps"),
    taskIndex: v.number(),
    taskTitle: v.string(),
    taskPrompts: v.array(v.string()),
    content: v.string(),
    targetRole: v.string(),
    stepType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const { generateObject } = await import("ai");
    const { entryGradeSchema } = await import("../lib/ai/schemas");
    const { buildEntryGradePrompt } = await import("../lib/ai/prompts");

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const prompt = buildEntryGradePrompt({
      taskTitle: args.taskTitle,
      taskPrompts: args.taskPrompts,
      content: args.content,
      targetRole: args.targetRole,
      stepType: args.stepType,
    });

    const result = await generateObject({
      model: openrouter.chat(OPENROUTER_MODELS.flash),
      schema: entryGradeSchema,
      prompt,
    });

    await ctx.runMutation(internal.stepEntries.setGrade, {
      stepId: args.stepId,
      taskIndex: args.taskIndex,
      grade: result.object,
    });
  },
});
