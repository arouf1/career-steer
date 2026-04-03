import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
