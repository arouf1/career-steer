import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

export const create = mutation({
  args: {
    diagnosticId: v.id("diagnostics"),
    lane: v.union(
      v.literal("career_switch"),
      v.literal("promotion"),
      v.literal("job_search"),
      v.literal("career_clarity"),
    ),
    targetRole: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const existingActive = await ctx.db
      .query("journeys")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", "active"),
      )
      .unique();

    if (existingActive) {
      await ctx.db.patch(existingActive._id, { status: "paused" });
    }

    return await ctx.db.insert("journeys", {
      userId: user._id,
      diagnosticId: args.diagnosticId,
      lane: args.lane,
      status: "active",
      startedAt: Date.now(),
      targetRole: args.targetRole,
      targetTimeline: null,
    });
  },
});

export const getActiveForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    return await ctx.db
      .query("journeys")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", "active"),
      )
      .unique();
  },
});

export const getById = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.journeyId);
  },
});

export const getCompletionStats = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) return null;

    const allSteps = await ctx.db
      .query("steps")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId),
      )
      .collect();

    const stepsCompleted = allSteps.filter(
      (s) => s.status === "completed" || s.status === "skipped",
    ).length;

    const weekNumbers = new Set(allSteps.map((s) => s.weekNumber));
    const activeWeeks = new Set(
      allSteps
        .filter((s) => s.status === "completed" || s.status === "skipped")
        .map((s) => s.weekNumber),
    );

    const stepsByType: Record<string, number> = {};
    for (const step of allSteps.filter((s) => s.status === "completed")) {
      stepsByType[step.type] = (stepsByType[step.type] ?? 0) + 1;
    }

    return {
      stepsCompleted,
      stepsTotal: allSteps.length,
      weeksTotal: weekNumbers.size,
      weeksActive: activeWeeks.size,
      stepsByType,
      startedAt: journey.startedAt,
      targetRole: journey.targetRole,
      lane: journey.lane,
    };
  },
});

export const getAllActive = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("journeys")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});
