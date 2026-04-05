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
          reasoning: z
            .string()
            .describe(
              "1-2 sentence explanation of why this level was assigned based on the user's profile",
            ),
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

export const resourceTypeEnum = z.enum(["course", "book", "article", "project", "community", "other"]);

export const gapAnalysisTaskSchema = z.object({
  skillName: z.string().describe("Matches a skill name from the skills array"),
  title: z
    .string()
    .describe("Short, descriptive title, e.g. 'Evidence & Plan: Data Visualisation'"),
  guidance: z
    .string()
    .describe(
      "Detailed guidance on what evidence to provide for current capability and what kind of action plan to write for closing the gap",
    ),
  prompts: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe(
      "Mix of evidence and planning prompts, e.g. 'Current Evidence: Describe a project where you applied this skill…' and 'Action Plan: What specific steps will you take to reach the required level?'",
    ),
});

export type GapAnalysisTask = z.infer<typeof gapAnalysisTaskSchema>;

export const gapAnalysisLlmSchema = z.object({
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
      searchQuery: z
        .string()
        .describe(
          "A natural-language search query to find a real resource for this skill gap",
        ),
      type: resourceTypeEnum,
    }),
  ),
  tasks: z
    .array(gapAnalysisTaskSchema)
    .max(6)
    .optional()
    .describe(
      "One interactive task per high/medium priority skill gap where currentLevel < requiredLevel, ordered by priority (high first). Generate 2-6 tasks.",
    ),
});

export type GapAnalysisLlmOutput = z.infer<typeof gapAnalysisLlmSchema>;

export const enrichedResourceSchema = z.object({
  skill: z.string(),
  title: z.string(),
  url: z.string().optional(),
  favicon: z.string().optional(),
  description: z.string(),
  type: resourceTypeEnum,
});

export type EnrichedResource = z.infer<typeof enrichedResourceSchema>;

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
  suggestedResources: z.array(enrichedResourceSchema),
  tasks: z.array(gapAnalysisTaskSchema).optional(),
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

export const dashboardCommentaryResponseSchema = z.object({
  commentary: z
    .string()
    .min(1)
    .max(1200)
    .describe(
      "2–4 short sentences acknowledging concrete progress on their roadmap. Holistic journey view, not a weekly check-in.",
    ),
});

export type DashboardCommentaryResponse = z.infer<
  typeof dashboardCommentaryResponseSchema
>;

export const salaryBandsSchema = z.object({
  currencySymbol: z.string().describe("Currency symbol for the location, e.g. £, $, €"),
  bands: z
    .array(z.string())
    .min(5)
    .max(7)
    .describe(
      "Salary bands formatted with currency and thousands separators, ordered lowest to highest, e.g. ['£30,000–£40,000', '£40,000–£50,000']",
    ),
});

export type SalaryBands = z.infer<typeof salaryBandsSchema>;

export const cvExtractionSchema = z.object({
  currentRole: z
    .string()
    .describe("Most recent job title, or empty string if not found"),
  experienceLevel: z
    .enum(["early", "mid", "senior"])
    .describe("early = 0-3 years, mid = 3-8 years, senior = 8+ years"),
  industry: z
    .string()
    .describe("Primary industry based on employment history, or empty string if unclear"),
  salaryBand: z
    .string()
    .describe(
      "Salary only if explicitly stated in the CV. Empty string if not mentioned.",
    ),
  education: z
    .string()
    .describe("Highest qualification, or empty string if not found"),
});

export type CvExtraction = z.infer<typeof cvExtractionSchema>;

export const evidenceCaptureOutputSchema = z.object({
  introduction: z.string().describe(
    "A 2-3 sentence context-setting paragraph explaining why this evidence matters and how it connects to the user's career goals",
  ),
  tasks: z
    .array(
      z.object({
        title: z.string().describe("Short, descriptive title for this task, e.g. 'Win 1: Cost Optimisation Modelling'"),
        guidance: z.string().describe(
          "Detailed guidance on what to write for this task — which project to pick, what angle to take, and why it matters for the target role",
        ),
        prompts: z
          .array(z.string())
          .min(2)
          .max(4)
          .describe(
            "Structured writing prompts to guide the user, e.g. 'Business Problem: What was the strategic threat or commercial opportunity?'",
          ),
      }),
    )
    .min(2)
    .max(5),
  nextAction: z.string().describe(
    "A concrete next-action paragraph telling the user exactly what to do and how long it should take",
  ),
});

export type EvidenceCaptureOutput = z.infer<typeof evidenceCaptureOutputSchema>;

export const entryGradeSchema = z.object({
  letter: z.enum(["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"]),
  summary: z.string().describe("1-2 sentence overall assessment of the response quality"),
  strengths: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("What the response does well"),
  improvements: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("Specific, actionable tips to strengthen the response"),
});

export type EntryGrade = z.infer<typeof entryGradeSchema>;

export const jobInsightsSchema = z.object({
  skillDemand: z.array(
    z.object({
      skill: z.string().describe("Normalised skill name"),
      frequency: z.number().describe("Number of postings that mention this skill"),
      totalJobs: z.number().describe("Total postings analysed"),
      importance: z
        .enum(["critical", "important", "nice_to_have"])
        .describe("How essential this skill appears to be based on wording and frequency"),
    })
  ),
  salaryAnalysis: z.object({
    lowestSeen: z
      .string()
      .optional()
      .describe("Lowest salary figure seen across postings, formatted with currency"),
    highestSeen: z
      .string()
      .optional()
      .describe("Highest salary figure seen across postings, formatted with currency"),
    mostCommonRange: z
      .string()
      .optional()
      .describe("Most frequently cited salary range, formatted with currency"),
    commentary: z
      .string()
      .describe("1-2 sentence analysis of the salary landscape for this role"),
  }),
  industryClusters: z.array(
    z.object({
      category: z
        .string()
        .describe("Industry or company-type label, e.g. FinTech, Consultancy, Enterprise SaaS"),
      companies: z.array(z.string()).describe("Company names in this cluster"),
      typicalRequirements: z
        .array(z.string())
        .describe("Skills or traits that are especially common in this cluster"),
    })
  ),
  gapAlignment: z.array(
    z.object({
      skill: z.string().describe("Skill name matching one of the user's bridge skills"),
      userLevel: z
        .enum(["strong", "partial", "gap", "unknown"])
        .describe("The user's current level for this skill"),
      marketDemand: z
        .number()
        .describe("Number of postings requiring this skill"),
      commentary: z
        .string()
        .describe("Personalised insight connecting the user's level to market demand"),
    })
  ),
  keyPatterns: z
    .array(z.string())
    .describe("3-5 notable patterns observed across the postings"),
  overallNarrative: z
    .string()
    .describe("2-3 paragraph summary of the job market landscape for this role, in British English"),
});

export type JobInsights = z.infer<typeof jobInsightsSchema>;
