import { v } from "convex/values";
import { OPENROUTER_MODELS } from "../lib/ai/openrouter-models";
import { action, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { JOURNEY_LANES, STEP_TYPES } from "../lib/constants";

/** Client-only refresh key when step statuses or grades change (not persisted). */
function computeContentFingerprint(
  steps: Array<{ _id: Id<"steps">; status: string }>,
  entries: Array<{
    stepId: Id<"steps">;
    taskIndex: number;
    grade?: { letter: string; summary: string } | null;
  }>,
): string {
  const stepSig = steps
    .map((s) => `${s._id}:${s.status}`)
    .sort()
    .join(";");
  const gradedSig = entries
    .filter((e) => e.grade != null)
    .map((e) => {
      const g = e.grade!;
      const summary =
        g.summary.length > 200 ? `${g.summary.slice(0, 197)}…` : g.summary;
      return `${e.stepId}:${e.taskIndex}:${g.letter}:${summary}`;
    })
    .sort()
    .join(";");
  return `${stepSig}|G:${gradedSig}`;
}

function buildGradeLines(
  steps: Doc<"steps">[],
  entries: Doc<"stepEntries">[],
): string[] {
  const stepById = new Map(steps.map((s) => [s._id, s]));
  return entries
    .filter((e) => e.grade != null)
    .sort((a, b) => {
      const sa = stepById.get(a.stepId);
      const sb = stepById.get(b.stepId);
      if (!sa || !sb) return 0;
      if (sa.weekNumber !== sb.weekNumber) return sa.weekNumber - sb.weekNumber;
      if (a.stepId !== b.stepId) return String(a.stepId).localeCompare(String(b.stepId));
      return a.taskIndex - b.taskIndex;
    })
    .map((e) => {
      const step = stepById.get(e.stepId);
      const title = step?.title ?? "Step";
      const week = step?.weekNumber ?? "?";
      const typeLabel = step ? stepTypeLabel(step.type) : "";
      const g = e.grade!;
      const summary =
        g.summary.length > 220 ? `${g.summary.slice(0, 217)}…` : g.summary;
      return `Week ${week} · ${typeLabel} · "${title}" — Task ${e.taskIndex + 1}: ${g.letter} — ${summary}`;
    });
}

function stepTypeLabel(type: Doc<"steps">["type"]): string {
  return STEP_TYPES[type]?.label ?? type;
}

/** Whether the user has completed at least one step (eligible for dashboard commentary). */
export const getDashboardCommentaryState = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== user._id) return null;

    const steps = await ctx.db
      .query("steps")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId),
      )
      .collect();

    const entries = await ctx.db
      .query("stepEntries")
      .withIndex("by_journeyId", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    const hasCompleted = steps.some((s) => s.status === "completed");
    const contentFingerprint = computeContentFingerprint(steps, entries);
    return {
      showCommentary: hasCompleted,
      /** Present whenever the query returns a row (not null); drives client refetch when progress/grades change. */
      contentFingerprint,
    };
  },
});

export const ensureDashboardCommentary = action({
  args: { journeyId: v.id("journeys") },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { kind: "not_authenticated" }
    | { kind: "forbidden" }
    | { kind: "no_progress" }
    | { kind: "no_roadmap" }
    | { kind: "failure" }
    | { kind: "success"; commentary: string }
  > => {
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) {
      return { kind: "not_authenticated" };
    }

    const journey = await ctx.runQuery(api.journeys.getById, {
      journeyId: args.journeyId,
    });
    if (!journey || journey.userId !== user._id) {
      return { kind: "forbidden" };
    }

    const steps = await ctx.runQuery(api.steps.getAllByJourney, {
      journeyId: args.journeyId,
    });
    const entries = await ctx.runQuery(api.stepEntries.getAllByJourney, {
      journeyId: args.journeyId,
    });
    if (entries === null) {
      return { kind: "forbidden" };
    }

    const hasCompleted = steps.some((s) => s.status === "completed");
    if (!hasCompleted) {
      return { kind: "no_progress" };
    }

    const roadmap = await ctx.runQuery(api.roadmaps.getByJourneyId, {
      journeyId: args.journeyId,
    });
    if (!roadmap) {
      return { kind: "no_roadmap" };
    }

    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const { generateObject } = await import("ai");
    const { buildDashboardCommentaryPrompt } = await import("../lib/ai/prompts");
    const { dashboardCommentaryResponseSchema } = await import(
      "../lib/ai/schemas"
    );

    const laneInfo =
      JOURNEY_LANES[journey.lane as keyof typeof JOURNEY_LANES];

    const milestoneLines = roadmap.milestones.map(
      (m) => `Week ${m.weekNumber}: ${m.title}`,
    );

    const stepLines = steps.map((s) => {
      const typeLabel = stepTypeLabel(s.type);
      return `Week ${s.weekNumber}: ${s.status} — ${typeLabel} — ${s.title}`;
    });

    const gradeLines = buildGradeLines(steps, entries);

    const completedCount = steps.filter((s) => s.status === "completed").length;

    const prompt = buildDashboardCommentaryPrompt({
      userName: user.name,
      laneLabel: laneInfo.label,
      targetRole: journey.targetRole,
      roadmapOverview: roadmap.overview,
      milestoneLines,
      stepLines,
      gradeLines,
      completedCount,
      totalCount: steps.length,
    });

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    try {
      const { object } = await generateObject({
        model: openrouter.chat(OPENROUTER_MODELS.flashLite),
        schema: dashboardCommentaryResponseSchema,
        prompt,
        maxOutputTokens: 1024,
      });

      const trimmed = object.commentary.trim();
      if (!trimmed) {
        return { kind: "failure" };
      }

      return { kind: "success", commentary: trimmed };
    } catch {
      return { kind: "failure" };
    }
  },
});
