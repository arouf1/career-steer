import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

export const create = mutation({
  args: {
    roadmapId: v.id("roadmaps"),
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
    order: v.number(),
    type: v.union(
      v.literal("cv_rewrite"),
      v.literal("linkedin_rewrite"),
      v.literal("interview_prep"),
      v.literal("gap_analysis"),
      v.literal("skill_plan"),
      v.literal("networking"),
      v.literal("application"),
      v.literal("reflection"),
      v.literal("evidence_capture"),
      v.literal("manager_prep"),
      v.literal("values_assessment"),
      v.literal("custom"),
    ),
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("locked"),
      v.literal("available"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("skipped"),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("steps", {
      ...args,
      generationStatus: "idle",
      output: null,
    });
  },
});

export const getByJourneyAndWeek = query({
  args: {
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("steps")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId).eq("weekNumber", args.weekNumber),
      )
      .collect();
  },
});

export const getAllByJourney = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("steps")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId),
      )
      .collect();

    return steps.sort((a, b) =>
      a.weekNumber !== b.weekNumber
        ? a.weekNumber - b.weekNumber
        : a.order - b.order,
    );
  },
});

export const getById = query({
  args: { stepId: v.id("steps") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.stepId);
  },
});

export const updateStatus = mutation({
  args: {
    stepId: v.id("steps"),
    status: v.union(
      v.literal("locked"),
      v.literal("available"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("skipped"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stepId, { status: args.status });
  },
});

export const setGenerationStatus = mutation({
  args: {
    stepId: v.id("steps"),
    generationStatus: v.union(
      v.literal("idle"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    output: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      generationStatus: args.generationStatus,
    };
    if (args.output !== undefined) {
      patch.output = args.output;
    }
    await ctx.db.patch(args.stepId, patch);
  },
});

export const unlockWeek = mutation({
  args: {
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("steps")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId).eq("weekNumber", args.weekNumber),
      )
      .collect();

    for (const step of steps) {
      if (step.status === "locked") {
        await ctx.db.patch(step._id, { status: "available" });
      }
    }
  },
});

export const generateStepOutput = action({
  args: { stepId: v.id("steps") },
  handler: async (ctx, args) => {
    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const { generateObject, generateText } = await import("ai");

    const step = await ctx.runQuery(api.steps.getById, { stepId: args.stepId });
    if (!step) throw new Error("Step not found");

    const journey = await ctx.runQuery(api.journeys.getById, {
      journeyId: step.journeyId,
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

    await ctx.runMutation(api.steps.setGenerationStatus, {
      stepId: args.stepId,
      generationStatus: "generating",
    });

    const { buildStepPrompt } = await import("../lib/ai/prompts");
    const {
      cvRewriteOutputSchema,
      gapAnalysisOutputSchema,
      interviewPrepOutputSchema,
    } = await import("../lib/ai/schemas");

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const promptContext = {
      userName: user.name,
      stepType: step.type,
      stepTitle: step.title,
      stepDescription: step.description,
      lane: journey.lane,
      targetRole: journey.targetRole,
      currentRole: user.profile.currentRole,
      industry: user.profile.industry,
      strengths: diagnostic.analysis.topStrengths,
      blockers: diagnostic.analysis.keyBlockers,
    };

    const prompt = buildStepPrompt(promptContext);
    const model = openrouter.chat("google/gemini-2.5-pro");

    try {
      let output: unknown;

      const structuredTypes: Record<string, typeof cvRewriteOutputSchema> = {
        cv_rewrite: cvRewriteOutputSchema,
        gap_analysis: gapAnalysisOutputSchema,
        interview_prep: interviewPrepOutputSchema,
      };

      const schema = structuredTypes[step.type];

      if (schema) {
        const result = await generateObject({ model, schema, prompt });
        output = result.object;
      } else {
        const result = await generateText({ model, prompt });
        output = { content: result.text };
      }

      await ctx.runMutation(api.steps.setGenerationStatus, {
        stepId: args.stepId,
        generationStatus: "completed",
        output,
      });

      return output;
    } catch (error) {
      await ctx.runMutation(api.steps.setGenerationStatus, {
        stepId: args.stepId,
        generationStatus: "failed",
      });
      throw error;
    }
  },
});
