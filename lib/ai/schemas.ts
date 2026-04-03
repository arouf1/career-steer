import { z } from "zod";

export const diagnosticAnalysisSchema = z.object({
  recommendedLane: z.enum([
    "career_switch",
    "promotion",
    "job_search",
    "career_clarity",
  ]),
  topStrengths: z.array(z.string()).min(3).max(5),
  keyBlockers: z.array(z.string()).min(2).max(4),
  suggestedRoles: z.array(z.string()).length(3),
  feasibilityScore: z.number().min(0).max(100),
  summary: z.string(),
  pathMapData: z.array(
    z.object({
      targetRole: z.string(),
      fitScore: z.number().min(0).max(100),
      salaryRange: z.string(),
      timelineEstimate: z.string(),
      bridgeSkills: z.array(
        z.object({
          skill: z.string(),
          level: z.enum(["strong", "partial", "gap"]),
        }),
      ),
    }),
  ),
});

export type DiagnosticAnalysis = z.infer<typeof diagnosticAnalysisSchema>;

export const roadmapGenerationSchema = z.object({
  overview: z.string().describe("A 2-3 sentence summary of the roadmap strategy"),
  durationWeeks: z.number().min(4).max(8),
  milestones: z.array(
    z.object({
      weekNumber: z.number(),
      title: z.string(),
      description: z.string(),
      steps: z.array(
        z.object({
          type: z.enum([
            "cv_rewrite",
            "linkedin_rewrite",
            "interview_prep",
            "gap_analysis",
            "skill_plan",
            "networking",
            "application",
            "reflection",
            "evidence_capture",
            "manager_prep",
            "values_assessment",
            "custom",
          ]),
          title: z.string(),
          description: z.string(),
        }),
      ),
    }),
  ),
});

export type RoadmapGeneration = z.infer<typeof roadmapGenerationSchema>;

export const cvRewriteOutputSchema = z.object({
  professionalSummary: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      items: z.array(
        z.object({
          title: z.string(),
          bullets: z.array(z.string()),
        }),
      ),
    }),
  ),
  keywords: z.array(z.string()),
  tailoringNotes: z.array(z.string()),
});

export type CvRewriteOutput = z.infer<typeof cvRewriteOutputSchema>;

export const gapAnalysisOutputSchema = z.object({
  overallReadiness: z.number().min(0).max(100),
  skills: z.array(
    z.object({
      name: z.string(),
      currentLevel: z.enum(["none", "beginner", "intermediate", "advanced", "expert"]),
      requiredLevel: z.enum(["none", "beginner", "intermediate", "advanced", "expert"]),
      priority: z.enum(["high", "medium", "low"]),
    }),
  ),
  quickWins: z.array(z.string()),
  longerTermGaps: z.array(z.string()),
  suggestedResources: z.array(
    z.object({
      skill: z.string(),
      resource: z.string(),
      type: z.enum(["course", "book", "project", "community", "other"]),
    }),
  ),
});

export type GapAnalysisOutput = z.infer<typeof gapAnalysisOutputSchema>;

export const interviewPrepOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      category: z.enum(["behavioural", "technical", "situational", "role-specific"]),
      whyTheyAsk: z.string(),
      modelAnswer: z.string(),
      tips: z.array(z.string()),
    }),
  ),
});

export type InterviewPrepOutput = z.infer<typeof interviewPrepOutputSchema>;

export const checkInResponseSchema = z.object({
  encouragement: z.string(),
  updatedRecommendations: z.array(z.string()).min(2).max(3),
});

export type CheckInResponse = z.infer<typeof checkInResponseSchema>;
