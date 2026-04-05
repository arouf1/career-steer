import { v } from "convex/values";
import { OPENROUTER_MODELS } from "../lib/ai/openrouter-models";
import { getStepTasksIncompleteReason } from "../lib/step-tasks";
import { mutation, internalMutation, query, action } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const create = internalMutation({
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
    const step = await ctx.db.get(args.stepId);
    if (!step) throw new Error("Step not found");

    if (args.status === "completed") {
      const entries = await ctx.db
        .query("stepEntries")
        .withIndex("by_stepId", (q) => q.eq("stepId", args.stepId))
        .collect();

      const tasksReason = getStepTasksIncompleteReason(
        { type: step.type, output: step.output },
        entries,
      );
      if (tasksReason) {
        throw new Error(tasksReason);
      }
    }

    await ctx.db.patch(args.stepId, { status: args.status });

    if (args.status === "completed" || args.status === "skipped") {
      const weekSteps = await ctx.db
        .query("steps")
        .withIndex("by_journeyId_weekNumber", (q) =>
          q.eq("journeyId", step.journeyId).eq("weekNumber", step.weekNumber),
        )
        .collect();

      const allWeekDone = weekSteps.every((s) =>
        s._id.toString() === args.stepId.toString()
          ? args.status === "completed" || args.status === "skipped"
          : s.status === "completed" || s.status === "skipped",
      );

      if (allWeekDone) {
        const nextWeek = step.weekNumber + 1;
        const nextWeekSteps = await ctx.db
          .query("steps")
          .withIndex("by_journeyId_weekNumber", (q) =>
            q.eq("journeyId", step.journeyId).eq("weekNumber", nextWeek),
          )
          .collect();

        for (const nextStep of nextWeekSteps) {
          if (nextStep.status === "locked") {
            await ctx.db.patch(nextStep._id, { status: "available" });
          }
        }
      }

      const allSteps = await ctx.db
        .query("steps")
        .withIndex("by_journeyId_weekNumber", (q) =>
          q.eq("journeyId", step.journeyId),
        )
        .collect();

      const allJourneyDone = allSteps.every((s) =>
        s._id.toString() === args.stepId.toString()
          ? args.status === "completed" || args.status === "skipped"
          : s.status === "completed" || s.status === "skipped",
      );

      if (allJourneyDone) {
        await ctx.db.patch(step.journeyId, { status: "completed" });
      }
    }
  },
});

export const setGenerationStatus = internalMutation({
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

export const unlockWeek = internalMutation({
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
  handler: async (ctx, args): Promise<unknown> => {
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

    const jobSearch = await ctx.runQuery(api.jobSearches.getLatest, {
      journeyId: step.journeyId,
    });

    await ctx.runMutation(internal.steps.setGenerationStatus, {
      stepId: args.stepId,
      generationStatus: "generating",
    });

    const { buildStepPrompt } = await import("../lib/ai/prompts");
    const {
      cvRewriteOutputSchema,
      gapAnalysisLlmSchema,
      interviewPrepOutputSchema,
      evidenceCaptureOutputSchema,
    } = await import("../lib/ai/schemas");
    const { enrichResources } = await import("../lib/ai/exa-resources");

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
      jobPostings: jobSearch?.jobs,
    };

    const prompt = buildStepPrompt(promptContext);
    const model = openrouter.chat(OPENROUTER_MODELS.pro);

    try {
      let output: unknown;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const structuredTypes: Record<string, any> = {
        cv_rewrite: cvRewriteOutputSchema,
        gap_analysis: gapAnalysisLlmSchema,
        interview_prep: interviewPrepOutputSchema,
        evidence_capture: evidenceCaptureOutputSchema,
      };

      const schema = structuredTypes[step.type];

      if (schema) {
        const genOpts: Parameters<typeof generateObject>[0] = { model, schema, prompt };
        if (step.type === "gap_analysis") {
          genOpts.maxOutputTokens = 65536;
        }
        const result = await generateObject(genOpts);
        output = result.object;

        if (step.type === "gap_analysis") {
          const llmOutput = output as {
            overallReadiness: number;
            skills: unknown[];
            quickWins: string[];
            longerTermGaps: string[];
            suggestedResources: {
              skill: string;
              searchQuery: string;
              type: "course" | "book" | "project" | "community" | "other";
            }[];
          };
          const enrichedResources = await enrichResources(
            llmOutput.suggestedResources,
          );
          output = { ...llmOutput, suggestedResources: enrichedResources };
        }
      } else {
        const result = await generateText({ model, prompt });
        output = { content: result.text };
      }

      await ctx.runMutation(internal.steps.setGenerationStatus, {
        stepId: args.stepId,
        generationStatus: "completed",
        output,
      });

      return output;
    } catch (error) {
      await ctx.runMutation(internal.steps.setGenerationStatus, {
        stepId: args.stepId,
        generationStatus: "failed",
      });
      throw error;
    }
  },
});
