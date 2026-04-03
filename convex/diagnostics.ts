import { v } from "convex/values";
import { mutation, internalMutation, query, action } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const saveDiagnostic = mutation({
  args: {
    profile: v.object({
      currentRole: v.string(),
      experienceLevel: v.union(
        v.literal("early"),
        v.literal("mid"),
        v.literal("senior"),
      ),
      industry: v.string(),
      salaryBand: v.string(),
      location: v.string(),
      education: v.string(),
    }),
    answers: v.object({
      goalState: v.union(
        v.literal("new_job"),
        v.literal("promotion"),
        v.literal("new_direction"),
        v.literal("career_switch"),
        v.literal("not_sure"),
      ),
      frictions: v.array(v.string()),
      constraints: v.object({
        hoursPerWeek: v.number(),
        salaryFloor: v.number(),
        urgency: v.union(
          v.literal("low"),
          v.literal("medium"),
          v.literal("high"),
        ),
        willingnessToRetrain: v.boolean(),
      }),
      confidence: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { profile: args.profile });

    return await ctx.db.insert("diagnostics", {
      userId: user._id,
      completedAt: Date.now(),
      answers: args.answers,
      analysis: null,
    });
  },
});

export const generateAnalysis = action({
  args: { diagnosticId: v.id("diagnostics") },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const { generateObject } = await import("ai");

    const diagnostic = await ctx.runQuery(api.diagnostics.getById, {
      diagnosticId: args.diagnosticId,
    });
    if (!diagnostic) throw new Error("Diagnostic not found");

    const user = await ctx.runQuery(api.users.getById, {
      userId: diagnostic.userId,
    });
    if (!user || !user.profile) throw new Error("User profile not found");

    const { buildDiagnosticPrompt } = await import("../lib/ai/prompts");
    const { diagnosticAnalysisSchema } = await import("../lib/ai/schemas");

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const { object } = await generateObject({
      model: openrouter.chat("google/gemini-2.5-pro"),
      schema: diagnosticAnalysisSchema,
      prompt: buildDiagnosticPrompt(user.name, user.profile, diagnostic.answers),
    });

    await ctx.runMutation(internal.diagnostics.saveAnalysis, {
      diagnosticId: args.diagnosticId,
      analysis: object,
    });

    return object;
  },
});

export const saveAnalysis = internalMutation({
  args: {
    diagnosticId: v.id("diagnostics"),
    analysis: v.object({
      recommendedLane: v.union(
        v.literal("career_switch"),
        v.literal("promotion"),
        v.literal("job_search"),
        v.literal("career_clarity"),
      ),
      topStrengths: v.array(v.string()),
      keyBlockers: v.array(v.string()),
      suggestedRoles: v.array(v.string()),
      feasibilityScore: v.number(),
      summary: v.string(),
      pathMapData: v.array(
        v.object({
          targetRole: v.string(),
          fitScore: v.number(),
          salaryRange: v.string(),
          timelineEstimate: v.string(),
          bridgeSkills: v.array(
            v.object({
              skill: v.string(),
              level: v.union(
                v.literal("strong"),
                v.literal("partial"),
                v.literal("gap"),
              ),
            }),
          ),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.diagnosticId, { analysis: args.analysis });
  },
});

export const getById = query({
  args: { diagnosticId: v.id("diagnostics") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.diagnosticId);
  },
});

export const getLatestForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const diagnostics = await ctx.db
      .query("diagnostics")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(1);

    return diagnostics[0] ?? null;
  },
});
