import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const jobValidator = v.object({
  title: v.string(),
  companyName: v.string(),
  location: v.string(),
  description: v.string(),
  salary: v.optional(v.string()),
  schedule: v.optional(v.string()),
  postedAt: v.optional(v.string()),
  applyLink: v.optional(v.string()),
  shareLink: v.optional(v.string()),
  highlights: v.optional(
    v.object({
      qualifications: v.optional(v.array(v.string())),
      responsibilities: v.optional(v.array(v.string())),
    })
  ),
  thumbnail: v.optional(v.string()),
});

export const getLatest = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("jobSearches")
      .withIndex("by_journeyId", (q) => q.eq("journeyId", args.journeyId))
      .order("desc")
      .take(1);

    if (latest.length === 0) {
      return null;
    }

    const doc = latest[0];
    const isStale = Date.now() - doc.fetchedAt > SEVEN_DAYS_MS;

    return {
      _id: doc._id,
      jobs: doc.jobs,
      query: doc.query,
      location: doc.location,
      fetchedAt: doc.fetchedAt,
      isStale,
    };
  },
});

export const save = mutation({
  args: {
    journeyId: v.id("journeys"),
    query: v.string(),
    location: v.optional(v.string()),
    jobs: v.array(jobValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const jobSearchId = await ctx.db.insert("jobSearches", {
      userId: user._id,
      journeyId: args.journeyId,
      query: args.query,
      location: args.location,
      fetchedAt: Date.now(),
      jobs: args.jobs,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.jobInsights.generate,
      { jobSearchId, journeyId: args.journeyId }
    );

    return jobSearchId;
  },
});
