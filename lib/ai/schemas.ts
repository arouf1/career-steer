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
