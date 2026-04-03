import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
    profile: v.union(
      v.object({
        currentRole: v.string(),
        experienceLevel: v.union(
          v.literal("early"),
          v.literal("mid"),
          v.literal("senior")
        ),
        industry: v.string(),
        salaryBand: v.string(),
        location: v.string(),
        education: v.string(),
      }),
      v.null()
    ),
  }).index("by_clerkId", ["clerkId"]),

  diagnostics: defineTable({
    userId: v.id("users"),
    completedAt: v.number(),
    answers: v.object({
      goalState: v.union(
        v.literal("new_job"),
        v.literal("promotion"),
        v.literal("new_direction"),
        v.literal("career_switch"),
        v.literal("not_sure")
      ),
      frictions: v.array(v.string()),
      constraints: v.object({
        hoursPerWeek: v.number(),
        salaryFloor: v.number(),
        urgency: v.union(
          v.literal("low"),
          v.literal("medium"),
          v.literal("high")
        ),
        willingnessToRetrain: v.boolean(),
      }),
      confidence: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      ),
    }),
    analysis: v.union(
      v.object({
        recommendedLane: v.union(
          v.literal("career_switch"),
          v.literal("promotion"),
          v.literal("job_search"),
          v.literal("career_clarity")
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
                  v.literal("gap")
                ),
              })
            ),
          })
        ),
      }),
      v.null()
    ),
  }).index("by_userId", ["userId"]),

  journeys: defineTable({
    userId: v.id("users"),
    diagnosticId: v.id("diagnostics"),
    lane: v.union(
      v.literal("career_switch"),
      v.literal("promotion"),
      v.literal("job_search"),
      v.literal("career_clarity")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
    startedAt: v.number(),
    targetRole: v.union(v.string(), v.null()),
    targetTimeline: v.union(v.string(), v.null()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"]),

  roadmaps: defineTable({
    journeyId: v.id("journeys"),
    generatedAt: v.number(),
    version: v.number(),
    overview: v.string(),
    durationWeeks: v.number(),
    milestones: v.array(
      v.object({
        weekNumber: v.number(),
        title: v.string(),
        description: v.string(),
      })
    ),
  }).index("by_journeyId", ["journeyId"]),

  steps: defineTable({
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
      v.literal("custom")
    ),
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("locked"),
      v.literal("available"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("skipped")
    ),
    generationStatus: v.union(
      v.literal("idle"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
    output: v.any(),
  })
    .index("by_journeyId_weekNumber", ["journeyId", "weekNumber"])
    .index("by_roadmapId", ["roadmapId"]),

  conversations: defineTable({
    stepId: v.id("steps"),
    userId: v.id("users"),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        createdAt: v.number(),
      })
    ),
  }).index("by_stepId", ["stepId"]),

  progressLogs: defineTable({
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
    completedAt: v.number(),
    stepsCompleted: v.number(),
    stepsTotal: v.number(),
    userReflection: v.union(v.string(), v.null()),
    blockers: v.union(v.string(), v.null()),
    encouragement: v.string(),
    updatedRecommendations: v.array(v.string()),
  }).index("by_journeyId_weekNumber", ["journeyId", "weekNumber"]),

  rateLimits: defineTable({
    userId: v.id("users"),
    date: v.string(),
    generationCount: v.number(),
    chatMessageCount: v.number(),
  }).index("by_userId_date", ["userId", "date"]),
});
