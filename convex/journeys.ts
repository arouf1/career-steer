import { v } from "convex/values";
import { mutation, query, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

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

export const getAllByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const journeys = await ctx.db
      .query("journeys")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const results = [];
    for (const journey of journeys) {
      const steps = await ctx.db
        .query("steps")
        .withIndex("by_journeyId_weekNumber", (q) =>
          q.eq("journeyId", journey._id),
        )
        .collect();
      const stepsCompleted = steps.filter(
        (s) => s.status === "completed" || s.status === "skipped",
      ).length;
      results.push({
        ...journey,
        stepsCompleted,
        stepsTotal: steps.length,
      });
    }

    return results.sort((a, b) => b.startedAt - a.startedAt);
  },
});

export const resume = mutation({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== user._id) {
      throw new Error("Journey not found");
    }
    if (journey.status === "active") return;

    const existingActive = await ctx.db
      .query("journeys")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", user._id).eq("status", "active"),
      )
      .unique();

    if (existingActive) {
      await ctx.db.patch(existingActive._id, { status: "paused" });
    }

    await ctx.db.patch(args.journeyId, { status: "active" });
  },
});

export const remove = mutation({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== user._id) {
      throw new Error("Journey not found");
    }

    const progressLogs = await ctx.db
      .query("progressLogs")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId),
      )
      .collect();
    for (const log of progressLogs) {
      await ctx.db.delete(log._id);
    }

    const steps = await ctx.db
      .query("steps")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId),
      )
      .collect();

    for (const step of steps) {
      const conv = await ctx.db
        .query("conversations")
        .withIndex("by_stepId", (q) => q.eq("stepId", step._id))
        .unique();
      if (conv) {
        await ctx.db.delete(conv._id);
      }
    }

    for (const step of steps) {
      await ctx.db.delete(step._id);
    }

    const roadmaps = await ctx.db
      .query("roadmaps")
      .withIndex("by_journeyId", (q) => q.eq("journeyId", args.journeyId))
      .collect();
    for (const rm of roadmaps) {
      await ctx.db.delete(rm._id);
    }

    await ctx.db.delete(args.journeyId);
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
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export const checkForInactiveUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    const activeJourneys = await ctx.runQuery(internal.journeys.getAllActive);
    const now = Date.now();
    const inactiveJourneyIds: string[] = [];

    for (const journey of activeJourneys) {
      const lastActivity = journey.startedAt;
      if (now - lastActivity > TWO_DAYS_MS) {
        inactiveJourneyIds.push(journey._id);
      }
    }

    if (inactiveJourneyIds.length > 0) {
      console.log(
        `[nudge] Found ${inactiveJourneyIds.length} inactive journey(s):`,
        inactiveJourneyIds,
      );
    }
  },
});
