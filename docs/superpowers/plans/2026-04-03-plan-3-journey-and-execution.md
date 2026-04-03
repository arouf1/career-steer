# Career Steer — Plan 3: Journey & Execution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build roadmap generation, the journey dashboard with weekly step views, the step workspace with type-specific UIs, AI-powered step output generation, and the streaming conversational assistant — so a user can follow their personalised roadmap and execute each step with AI support.

**Architecture:** Roadmap generation is a Convex action using AI SDK `generateObject`. The dashboard reads the active journey and its steps reactively via Convex queries. Each step has a workspace page that renders a type-specific UI and can trigger AI generation (Convex action). The conversational assistant uses a Next.js Route Handler with AI SDK `streamText` and the `useChat` hook on the client.

**Tech Stack:** Convex (actions, mutations, queries), Vercel AI SDK v6 + OpenRouter, Zod, Next.js Route Handlers, `useChat` hook

**Depends on:** Plan 2 (Diagnostic Engine) completed

---

## File Structure

```
app/(app)/
├── dashboard/
│   └── page.tsx                          — Updated: journey dashboard with weekly view
├── journey/
│   └── [journeyId]/
│       ├── roadmap/
│       │   └── page.tsx                  — Full roadmap view (triggers generation)
│       └── step/
│           └── [stepId]/
│               └── page.tsx              — Step workspace
├── api/
│   └── ai/
│       └── chat/
│           └── route.ts                  — Streaming chat Route Handler
components/
├── journey/
│   ├── roadmap-view.tsx                  — Roadmap milestone timeline
│   ├── week-view.tsx                     — Current week's steps
│   ├── step-card.tsx                     — Step card in dashboard/roadmap
│   └── step-workspace/
│       ├── index.tsx                     — Step workspace shell (output + assistant)
│       ├── step-output.tsx               — Renders type-specific AI output
│       ├── chat-assistant.tsx            — Step-scoped AI assistant panel
│       ├── outputs/
│       │   ├── cv-rewrite-output.tsx     — CV rewrite display
│       │   ├── gap-analysis-output.tsx   — Gap analysis display
│       │   ├── interview-prep-output.tsx — Interview prep display
│       │   └── generic-output.tsx        — Fallback for other types
│       └── generate-button.tsx           — Trigger AI generation for a step
convex/
├── roadmaps.ts                           — Roadmap mutations, queries, generation action
├── steps.ts                              — Step mutations, queries, generation actions
lib/
├── ai/
│   ├── prompts.ts                        — Extended: roadmap + step prompts
│   └── schemas.ts                        — Extended: roadmap + step output schemas
```

---

## Task 1: Roadmap AI Prompt and Schema

**Files:**
- Modify: `lib/ai/prompts.ts`, `lib/ai/schemas.ts`

- [ ] **Step 1: Add the roadmap prompt builder**

Append to `lib/ai/prompts.ts`:

```typescript
export function buildRoadmapPrompt(
  userName: string,
  profile: {
    currentRole: string;
    experienceLevel: string;
    industry: string;
  },
  analysis: {
    recommendedLane: string;
    topStrengths: string[];
    keyBlockers: string[];
    summary: string;
  },
  targetRole: string,
  constraints: {
    hoursPerWeek: number;
    urgency: string;
    willingnessToRetrain: boolean;
  }
): string {
  return `${BASE_PERSONA}

The user's name is ${userName}.

You are generating a personalised career roadmap for this user.

USER CONTEXT:
- Current role: ${profile.currentRole}
- Experience level: ${profile.experienceLevel}
- Industry: ${profile.industry}
- Target role: ${targetRole}
- Journey lane: ${analysis.recommendedLane}
- Top strengths: ${analysis.topStrengths.join(", ")}
- Key blockers: ${analysis.keyBlockers.join(", ")}
- Diagnostic summary: ${analysis.summary}

CONSTRAINTS:
- Available hours per week: ${constraints.hoursPerWeek}
- Urgency: ${constraints.urgency}
- Willing to retrain: ${constraints.willingnessToRetrain ? "Yes" : "No"}

INSTRUCTIONS:
1. Create a realistic week-by-week roadmap.
2. Duration should be 6-8 weeks for urgent users, 8-12 weeks for others.
3. Each week should have 3-5 actionable steps.
4. Steps must be specific and tied to the user's situation — not generic career advice.
5. Step types must be one of: cv_rewrite, linkedin_rewrite, interview_prep, gap_analysis, skill_plan, networking, application, reflection, evidence_capture, manager_prep, values_assessment, custom.
6. For a career_switch lane, prioritise: gap_analysis first, then cv_rewrite and linkedin_rewrite, then skill_plan, then interview_prep and networking, then application steps.
7. Estimate minutes for each step based on the user's available hours (do not exceed their weekly budget).
8. The overview should address the user by name and summarise the plan in 2-3 sentences.
9. Each milestone should have a clear title describing the theme of that week.

Be realistic about timelines. If the transition requires significant retraining, say so.`;
}
```

- [ ] **Step 2: Add the roadmap output schema**

Append to `lib/ai/schemas.ts`:

```typescript
export const roadmapGenerationSchema = z.object({
  overview: z.string().describe("2-3 sentence personalised summary of the roadmap"),
  durationWeeks: z.number().min(4).max(16),
  milestones: z.array(
    z.object({
      weekNumber: z.number(),
      title: z.string().describe("Theme of this week, e.g. 'Skills Assessment & Gap Mapping'"),
      description: z.string().describe("1-2 sentence description of the week's focus"),
      steps: z.array(
        z.object({
          type: z.enum([
            "cv_rewrite", "linkedin_rewrite", "interview_prep", "gap_analysis",
            "skill_plan", "networking", "application", "reflection",
            "evidence_capture", "manager_prep", "values_assessment", "custom",
          ]),
          title: z.string(),
          description: z.string().describe("What this step involves and why it matters"),
          estimatedMinutes: z.number().min(10).max(120),
        })
      ),
    })
  ),
});

export type RoadmapGeneration = z.infer<typeof roadmapGenerationSchema>;
```

- [ ] **Step 3: Add step-specific output schemas**

Append to `lib/ai/schemas.ts`:

```typescript
export const cvRewriteOutputSchema = z.object({
  summary: z.string().describe("Professional summary / personal statement"),
  sections: z.array(
    z.object({
      heading: z.string(),
      items: z.array(
        z.object({
          title: z.string(),
          organisation: z.string().optional(),
          period: z.string().optional(),
          bullets: z.array(z.string()),
        })
      ),
    })
  ),
  keywords: z.array(z.string()).describe("Key terms to include for ATS optimisation"),
  notes: z.string().describe("Advice on tailoring this per application"),
});

export const gapAnalysisOutputSchema = z.object({
  targetRoleRequirements: z.array(
    z.object({
      skill: z.string(),
      importance: z.enum(["essential", "preferred", "nice_to_have"]),
      userLevel: z.enum(["strong", "partial", "gap"]),
      evidence: z.string(),
      recommendation: z.string(),
    })
  ),
  overallReadiness: z.number().min(0).max(100),
  quickWins: z.array(z.string()),
  longerTermGaps: z.array(z.string()),
  suggestedResources: z.array(
    z.object({
      title: z.string(),
      type: z.enum(["course", "project", "reading", "community"]),
      rationale: z.string(),
    })
  ),
});

export const interviewPrepOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      category: z.enum(["behavioural", "technical", "situational", "motivational"]),
      whyTheyAsk: z.string(),
      modelAnswer: z.string(),
      tips: z.array(z.string()),
    })
  ),
  generalAdvice: z.string(),
  commonMistakes: z.array(z.string()),
});

export type CvRewriteOutput = z.infer<typeof cvRewriteOutputSchema>;
export type GapAnalysisOutput = z.infer<typeof gapAnalysisOutputSchema>;
export type InterviewPrepOutput = z.infer<typeof interviewPrepOutputSchema>;
```

- [ ] **Step 4: Add step prompt builders**

Append to `lib/ai/prompts.ts`:

```typescript
export function buildStepPrompt(
  userName: string,
  profile: { currentRole: string; experienceLevel: string; industry: string },
  targetRole: string,
  strengths: string[],
  stepType: string,
  stepTitle: string,
  stepDescription: string
): string {
  const typeInstructions: Record<string, string> = {
    cv_rewrite: `Rewrite the user's CV to position them for a ${targetRole} role.
- Reframe existing experience using language common in ${targetRole} job descriptions.
- Lead with transferable achievements, not job titles.
- Quantify impact wherever possible.
- Do NOT fabricate experience or qualifications.
- Produce a complete, structured CV.`,

    gap_analysis: `Analyse the gap between the user's current skills and what ${targetRole} requires.
- List each required skill with its importance level and the user's current level.
- Be specific about evidence for each rating.
- Suggest concrete ways to close each gap.
- Identify quick wins (things they can address in 1-2 weeks).`,

    interview_prep: `Generate interview questions the user is likely to face for ${targetRole} roles.
- Include 8-10 questions across behavioural, technical, situational, and motivational categories.
- Write model answers tailored to the user's actual experience.
- Include tips for each question.
- List common mistakes to avoid.`,

    linkedin_rewrite: `Rewrite the user's LinkedIn headline and summary for a ${targetRole} transition.
- Make the headline clear about their target, not just their current role.
- The summary should tell a transition story: where they've been, what they bring, where they're heading.
- Include relevant keywords for ${targetRole}.`,

    networking: `Create networking outreach templates for someone transitioning to ${targetRole}.
- Include messages for: informational interviews, reconnecting with contacts, reaching out to strangers in the field.
- Each message should be concise, genuine, and specific to their background.`,
  };

  const instruction = typeInstructions[stepType] ?? `Complete this step: ${stepTitle}\n${stepDescription}`;

  return `${BASE_PERSONA}

The user's name is ${userName}.
Current role: ${profile.currentRole}
Experience level: ${profile.experienceLevel}
Industry: ${profile.industry}
Target role: ${targetRole}
Key strengths: ${strengths.join(", ")}

TASK: ${stepTitle}
${instruction}`;
}

export function buildChatSystemPrompt(
  userName: string,
  profile: { currentRole: string },
  targetRole: string,
  stepType: string,
  stepTitle: string,
  hasOutput: boolean
): string {
  return `${BASE_PERSONA}

The user's name is ${userName}. Address them by name occasionally.
They are transitioning from ${profile.currentRole} to ${targetRole}.
They are currently working on: ${stepTitle} (step type: ${stepType}).

${hasOutput ? "They have a generated output for this step. They may ask you to refine, explain, or adjust parts of it." : "No output has been generated yet. Help them understand what this step involves."}

Stay focused on this step. If they ask about something unrelated, gently redirect them.
Be concise, practical, and encouraging without being patronising.`;
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add roadmap and step AI prompts and Zod schemas"
```

---

## Task 2: Convex Roadmap Functions

**Files:**
- Create: `convex/roadmaps.ts`

- [ ] **Step 1: Create roadmap queries, mutations, and generation action**

```typescript
// convex/roadmaps.ts
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

export const getByJourneyId = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const roadmaps = await ctx.db
      .query("roadmaps")
      .withIndex("by_journeyId", (q) => q.eq("journeyId", args.journeyId))
      .order("desc")
      .take(1);
    return roadmaps[0] ?? null;
  },
});

export const create = mutation({
  args: {
    journeyId: v.id("journeys"),
    overview: v.string(),
    durationWeeks: v.number(),
    milestones: v.array(
      v.object({
        weekNumber: v.number(),
        title: v.string(),
        description: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("roadmaps")
      .withIndex("by_journeyId", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    const version = existing.length + 1;

    return await ctx.db.insert("roadmaps", {
      journeyId: args.journeyId,
      generatedAt: Date.now(),
      version,
      overview: args.overview,
      durationWeeks: args.durationWeeks,
      milestones: args.milestones,
    });
  },
});

export const generateRoadmap = action({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const { generateObject } = await import("ai");

    const journey = await ctx.runQuery(api.journeys.getById, {
      journeyId: args.journeyId,
    });
    if (!journey) throw new Error("Journey not found");

    const user = await ctx.runQuery(api.users.getById, { userId: journey.userId });
    if (!user?.profile) throw new Error("User profile not found");

    const diagnostic = await ctx.runQuery(api.diagnostics.getById, {
      diagnosticId: journey.diagnosticId,
    });
    if (!diagnostic?.analysis) throw new Error("Diagnostic analysis not found");

    const { buildRoadmapPrompt } = await import("../lib/ai/prompts");
    const { roadmapGenerationSchema } = await import("../lib/ai/schemas");

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const { object } = await generateObject({
      model: openrouter.chat("google/gemini-2.5-pro"),
      schema: roadmapGenerationSchema,
      prompt: buildRoadmapPrompt(
        user.name,
        user.profile,
        diagnostic.analysis,
        journey.targetRole ?? "target role",
        diagnostic.answers.constraints
      ),
    });

    const roadmapId = await ctx.runMutation(api.roadmaps.create, {
      journeyId: args.journeyId,
      overview: object.overview,
      durationWeeks: object.durationWeeks,
      milestones: object.milestones.map((m) => ({
        weekNumber: m.weekNumber,
        title: m.title,
        description: m.description,
      })),
    });

    for (const milestone of object.milestones) {
      for (let i = 0; i < milestone.steps.length; i++) {
        const step = milestone.steps[i];
        await ctx.runMutation(api.steps.create, {
          roadmapId,
          journeyId: args.journeyId,
          weekNumber: milestone.weekNumber,
          order: i,
          type: step.type,
          title: step.title,
          description: step.description,
          status: milestone.weekNumber === 1 ? "available" : "locked",
        });
      }
    }

    return roadmapId;
  },
});
```

- [ ] **Step 2: Add `getById` query to journeys**

Append to `convex/journeys.ts`:

```typescript
export const getById = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.journeyId);
  },
});
```

- [ ] **Step 3: Push to Convex**

```bash
npx convex dev --once
```

Expected: All functions deploy.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add Convex roadmap generation action and mutations"
```

---

## Task 3: Convex Step Functions

**Files:**
- Create: `convex/steps.ts`

- [ ] **Step 1: Create step queries, mutations, and generation action**

```typescript
// convex/steps.ts
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

export const create = mutation({
  args: {
    roadmapId: v.id("roadmaps"),
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
    order: v.number(),
    type: v.union(
      v.literal("cv_rewrite"), v.literal("linkedin_rewrite"),
      v.literal("interview_prep"), v.literal("gap_analysis"),
      v.literal("skill_plan"), v.literal("networking"),
      v.literal("application"), v.literal("reflection"),
      v.literal("evidence_capture"), v.literal("manager_prep"),
      v.literal("values_assessment"), v.literal("custom")
    ),
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("locked"), v.literal("available"),
      v.literal("in_progress"), v.literal("completed"), v.literal("skipped")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("steps", {
      ...args,
      generationStatus: "idle",
      output: null,
    });
  },
});

export const getByJourneyAndWeek = query({
  args: {
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("steps")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId).eq("weekNumber", args.weekNumber)
      )
      .collect();
  },
});

export const getAllByJourney = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("steps")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId)
      )
      .collect();
  },
});

export const getById = query({
  args: { stepId: v.id("steps") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.stepId);
  },
});

export const updateStatus = mutation({
  args: {
    stepId: v.id("steps"),
    status: v.union(
      v.literal("locked"), v.literal("available"),
      v.literal("in_progress"), v.literal("completed"), v.literal("skipped")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stepId, { status: args.status });
  },
});

export const setGenerationStatus = mutation({
  args: {
    stepId: v.id("steps"),
    generationStatus: v.union(
      v.literal("idle"), v.literal("generating"),
      v.literal("completed"), v.literal("failed")
    ),
    output: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      generationStatus: args.generationStatus,
    };
    if (args.output !== undefined) {
      updates.output = args.output;
    }
    await ctx.db.patch(args.stepId, updates);
  },
});

export const unlockWeek = mutation({
  args: {
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("steps")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId).eq("weekNumber", args.weekNumber)
      )
      .collect();

    for (const step of steps) {
      if (step.status === "locked") {
        await ctx.db.patch(step._id, { status: "available" });
      }
    }
  },
});

export const generateStepOutput = action({
  args: { stepId: v.id("steps") },
  handler: async (ctx, args) => {
    const step = await ctx.runQuery(api.steps.getById, { stepId: args.stepId });
    if (!step) throw new Error("Step not found");

    await ctx.runMutation(api.steps.setGenerationStatus, {
      stepId: args.stepId,
      generationStatus: "generating",
    });

    try {
      const journey = await ctx.runQuery(api.journeys.getById, {
        journeyId: step.journeyId,
      });
      if (!journey) throw new Error("Journey not found");

      const user = await ctx.runQuery(api.users.getById, { userId: journey.userId });
      if (!user?.profile) throw new Error("User profile not found");

      const diagnostic = await ctx.runQuery(api.diagnostics.getById, {
        diagnosticId: journey.diagnosticId,
      });
      if (!diagnostic?.analysis) throw new Error("Diagnostic not found");

      const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
      const { generateObject, generateText } = await import("ai");
      const { buildStepPrompt } = await import("../lib/ai/prompts");
      const {
        cvRewriteOutputSchema,
        gapAnalysisOutputSchema,
        interviewPrepOutputSchema,
      } = await import("../lib/ai/schemas");

      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY!,
      });

      const prompt = buildStepPrompt(
        user.name,
        user.profile,
        journey.targetRole ?? "target role",
        diagnostic.analysis.topStrengths,
        step.type,
        step.title,
        step.description
      );

      const schemaMap: Record<string, unknown> = {
        cv_rewrite: cvRewriteOutputSchema,
        gap_analysis: gapAnalysisOutputSchema,
        interview_prep: interviewPrepOutputSchema,
      };

      const schema = schemaMap[step.type];

      let output: unknown;
      if (schema) {
        const result = await generateObject({
          model: openrouter.chat("google/gemini-2.5-pro"),
          schema: schema as import("zod").ZodSchema,
          prompt,
        });
        output = result.object;
      } else {
        const result = await generateText({
          model: openrouter.chat("google/gemini-2.5-flash"),
          prompt,
        });
        output = { content: result.text };
      }

      await ctx.runMutation(api.steps.setGenerationStatus, {
        stepId: args.stepId,
        generationStatus: "completed",
        output,
      });
    } catch (error) {
      console.error("Step generation failed:", error);
      await ctx.runMutation(api.steps.setGenerationStatus, {
        stepId: args.stepId,
        generationStatus: "failed",
      });
      throw error;
    }
  },
});
```

- [ ] **Step 2: Push to Convex**

```bash
npx convex dev --once
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add Convex step functions with AI generation action"
```

---

## Task 4: Roadmap Page

**Files:**
- Create: `components/journey/roadmap-view.tsx`, `app/(app)/journey/[journeyId]/roadmap/page.tsx`

- [ ] **Step 1: Create the roadmap view component**

```tsx
// components/journey/roadmap-view.tsx
"use client";

import { STEP_TYPES } from "@/lib/constants";
import { CheckCircle2, Circle, Lock } from "lucide-react";

interface Step {
  _id: string;
  type: keyof typeof STEP_TYPES;
  title: string;
  status: string;
  weekNumber: number;
}

interface Milestone {
  weekNumber: number;
  title: string;
  description: string;
}

interface RoadmapViewProps {
  milestones: Milestone[];
  steps: Step[];
  currentWeek: number;
}

const statusIcon = {
  locked: <Lock className="h-4 w-4 text-muted-foreground/50" />,
  available: <Circle className="h-4 w-4 text-accent" />,
  in_progress: <Circle className="h-4 w-4 text-accent fill-accent/20" />,
  completed: <CheckCircle2 className="h-4 w-4 text-success" />,
  skipped: <Circle className="h-4 w-4 text-muted-foreground line-through" />,
};

export function RoadmapView({ milestones, steps, currentWeek }: RoadmapViewProps) {
  return (
    <div className="space-y-6">
      {milestones.map((milestone) => {
        const weekSteps = steps
          .filter((s) => s.weekNumber === milestone.weekNumber)
          .sort((a, b) => a.weekNumber - b.weekNumber);
        const isCurrent = milestone.weekNumber === currentWeek;

        return (
          <div
            key={milestone.weekNumber}
            className={`rounded-xl border p-5 transition-colors ${
              isCurrent
                ? "border-accent/30 bg-accent/5"
                : "border-border bg-background"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">
                Week {milestone.weekNumber}: {milestone.title}
              </h3>
              {isCurrent && (
                <span className="text-xs font-medium text-accent">
                  Current week
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {milestone.description}
            </p>
            <ul className="mt-3 space-y-2">
              {weekSteps.map((step) => (
                <li key={step._id} className="flex items-center gap-2.5 text-sm">
                  {statusIcon[step.status as keyof typeof statusIcon] ?? statusIcon.locked}
                  <span
                    className={
                      step.status === "locked"
                        ? "text-muted-foreground/50"
                        : ""
                    }
                  >
                    {step.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {STEP_TYPES[step.type]?.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create the roadmap page**

```tsx
// app/(app)/journey/[journeyId]/roadmap/page.tsx
"use client";

import { use, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { RoadmapView } from "@/components/journey/roadmap-view";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function RoadmapPage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = use(params);
  const typedJourneyId = journeyId as Id<"journeys">;

  const journey = useQuery(api.journeys.getById, { journeyId: typedJourneyId });
  const roadmap = useQuery(api.roadmaps.getByJourneyId, { journeyId: typedJourneyId });
  const steps = useQuery(api.steps.getAllByJourney, { journeyId: typedJourneyId });
  const generateRoadmap = useAction(api.roadmaps.generateRoadmap);

  const [isGenerating, setIsGenerating] = useState(false);

  if (journey === undefined || roadmap === undefined || steps === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="text-2xl font-bold">Generate your roadmap</h1>
        <p className="mt-2 text-muted-foreground">
          We'll create a personalised week-by-week plan based on your diagnostic
          results and target role.
        </p>
        <Button
          variant="accent"
          className="mt-6"
          onClick={async () => {
            setIsGenerating(true);
            try {
              await generateRoadmap({ journeyId: typedJourneyId });
            } catch (error) {
              console.error("Roadmap generation failed:", error);
            }
            setIsGenerating(false);
          }}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating roadmap...
            </>
          ) : (
            "Generate my roadmap"
          )}
        </Button>
      </div>
    );
  }

  const completedSteps = steps?.filter((s) => s.status === "completed").length ?? 0;
  const totalSteps = steps?.length ?? 0;
  const currentWeek = Math.min(
    ...steps.filter((s) => s.status === "available" || s.status === "in_progress")
      .map((s) => s.weekNumber),
    roadmap.durationWeeks
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your Roadmap</h1>
        <p className="mt-1 text-muted-foreground">{roadmap.overview}</p>
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{roadmap.durationWeeks} weeks</span>
          <span>
            {completedSteps} / {totalSteps} steps completed
          </span>
        </div>
      </div>

      <RoadmapView
        milestones={roadmap.milestones}
        steps={steps ?? []}
        currentWeek={currentWeek}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add roadmap generation page and milestone view"
```

---

## Task 5: Updated Dashboard

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`
- Create: `components/journey/step-card.tsx`, `components/journey/week-view.tsx`

- [ ] **Step 1: Create the step card component**

```tsx
// components/journey/step-card.tsx
"use client";

import Link from "next/link";
import { STEP_TYPES } from "@/lib/constants";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepCardProps {
  id: string;
  journeyId: string;
  type: keyof typeof STEP_TYPES;
  title: string;
  description: string;
  status: string;
  generationStatus: string;
}

export function StepCard({ id, journeyId, type, title, description, status, generationStatus }: StepCardProps) {
  const isActionable = status === "available" || status === "in_progress";

  const content = (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        isActionable
          ? "border-border bg-background hover:shadow-sm hover:border-accent/30 cursor-pointer"
          : "border-border/50 bg-muted/30"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {status === "completed" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success shrink-0" />
          ) : (
            <Circle
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                isActionable ? "text-accent" : "text-muted-foreground/40"
              )}
            />
          )}
          <div>
            <p className={cn("text-sm font-medium", !isActionable && status !== "completed" && "text-muted-foreground/60")}>
              {title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            <span className="mt-1.5 inline-block text-xs text-muted-foreground">
              {STEP_TYPES[type]?.label}
            </span>
          </div>
        </div>
        {isActionable && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </div>
  );

  if (isActionable) {
    return <Link href={`/journey/${journeyId}/step/${id}`}>{content}</Link>;
  }

  return content;
}
```

- [ ] **Step 2: Create the week view component**

```tsx
// components/journey/week-view.tsx
"use client";

import { StepCard } from "./step-card";
import { STEP_TYPES } from "@/lib/constants";

interface Step {
  _id: string;
  journeyId: string;
  type: keyof typeof STEP_TYPES;
  title: string;
  description: string;
  status: string;
  generationStatus: string;
  order: number;
}

interface WeekViewProps {
  weekNumber: number;
  title: string;
  steps: Step[];
  journeyId: string;
}

export function WeekView({ weekNumber, title, steps, journeyId }: WeekViewProps) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">
        Week {weekNumber} — {title}
      </h3>
      <div className="mt-3 space-y-2">
        {sorted.map((step) => (
          <StepCard
            key={step._id}
            id={step._id}
            journeyId={journeyId}
            type={step.type}
            title={step.title}
            description={step.description}
            status={step.status}
            generationStatus={step.generationStatus}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update the dashboard page**

```tsx
// app/(app)/dashboard/page.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { WeekView } from "@/components/journey/week-view";
import { Button } from "@/components/ui/button";
import { JOURNEY_LANES } from "@/lib/constants";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const user = useQuery(api.users.getCurrentUser);
  const journey = useQuery(api.journeys.getActiveForUser);
  const roadmap = useQuery(
    api.roadmaps.getByJourneyId,
    journey ? { journeyId: journey._id } : "skip"
  );
  const steps = useQuery(
    api.steps.getAllByJourney,
    journey ? { journeyId: journey._id } : "skip"
  );

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Take the career diagnostic to get your personalised roadmap and start
          your journey.
        </p>
        <Button variant="accent" className="mt-6" asChild>
          <Link href="/diagnostic">
            Start your diagnostic
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <h1 className="text-2xl font-bold tracking-tight">
          {JOURNEY_LANES[journey.lane].label}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your journey has been created. Generate your roadmap to get started.
        </p>
        <Button variant="accent" className="mt-6" asChild>
          <Link href={`/journey/${journey._id}/roadmap`}>
            Generate my roadmap
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  const completedCount = steps?.filter((s) => s.status === "completed").length ?? 0;
  const totalCount = steps?.length ?? 0;

  const availableWeeks = [
    ...new Set(
      steps
        ?.filter((s) => s.status === "available" || s.status === "in_progress")
        .map((s) => s.weekNumber) ?? []
    ),
  ].sort();
  const currentWeek = availableWeeks[0] ?? 1;

  const currentWeekSteps = steps?.filter((s) => s.weekNumber === currentWeek) ?? [];
  const currentMilestone = roadmap.milestones.find(
    (m) => m.weekNumber === currentWeek
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {user?.name ? `${user.name}'s ` : ""}
          {JOURNEY_LANES[journey.lane].label}
        </h1>
        {journey.targetRole && (
          <p className="mt-1 text-muted-foreground">
            Target: {journey.targetRole}
          </p>
        )}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{completedCount} of {totalCount} steps completed</span>
            <span>{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {currentMilestone && (
        <WeekView
          weekNumber={currentWeek}
          title={currentMilestone.title}
          steps={currentWeekSteps as any}
          journeyId={journey._id}
        />
      )}

      <div className="pt-2">
        <Link
          href={`/journey/${journey._id}/roadmap`}
          className="text-sm text-accent hover:underline"
        >
          View full roadmap
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: update dashboard with journey view, week view, and step cards"
```

---

## Task 6: Step Output Display Components

**Files:**
- Create: `components/journey/step-workspace/outputs/cv-rewrite-output.tsx`, `components/journey/step-workspace/outputs/gap-analysis-output.tsx`, `components/journey/step-workspace/outputs/interview-prep-output.tsx`, `components/journey/step-workspace/outputs/generic-output.tsx`

- [ ] **Step 1: Create CV rewrite output component**

```tsx
// components/journey/step-workspace/outputs/cv-rewrite-output.tsx
"use client";

import type { CvRewriteOutput } from "@/lib/ai/schemas";

export function CvRewriteOutputView({ output }: { output: CvRewriteOutput }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-background p-5">
        <h3 className="text-sm font-medium text-muted-foreground">Professional Summary</h3>
        <p className="mt-2 text-sm">{output.summary}</p>
      </div>

      {output.sections.map((section, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-5">
          <h3 className="font-semibold">{section.heading}</h3>
          <div className="mt-3 space-y-4">
            {section.items.map((item, j) => (
              <div key={j}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.period && (
                    <span className="text-xs text-muted-foreground">{item.period}</span>
                  )}
                </div>
                {item.organisation && (
                  <p className="text-xs text-muted-foreground">{item.organisation}</p>
                )}
                <ul className="mt-1.5 space-y-1">
                  {item.bullets.map((bullet, k) => (
                    <li key={k} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-muted-foreground/50">•</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}

      {output.keywords.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="text-sm font-medium text-muted-foreground">Keywords for ATS</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {output.keywords.map((kw) => (
              <span key={kw} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {output.notes && (
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs font-medium text-muted-foreground">Tailoring notes</p>
          <p className="mt-1 text-sm text-muted-foreground">{output.notes}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create gap analysis output component**

```tsx
// components/journey/step-workspace/outputs/gap-analysis-output.tsx
"use client";

import type { GapAnalysisOutput } from "@/lib/ai/schemas";

const levelColours = {
  strong: "bg-success/10 text-success",
  partial: "bg-warning/10 text-warning",
  gap: "bg-danger/10 text-danger",
};

export function GapAnalysisOutputView({ output }: { output: GapAnalysisOutput }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-background p-5">
        <h3 className="text-sm font-medium text-muted-foreground">Overall Readiness</h3>
        <p className="mt-1 text-3xl font-bold">{output.overallReadiness}%</p>
      </div>

      <div className="rounded-xl border border-border bg-background p-5">
        <h3 className="font-semibold">Skills Assessment</h3>
        <div className="mt-3 space-y-3">
          {output.targetRoleRequirements.map((req, i) => (
            <div key={i} className="flex items-start justify-between gap-4 text-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{req.skill}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelColours[req.userLevel]}`}>
                    {req.userLevel}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{req.evidence}</p>
                <p className="mt-0.5 text-xs text-accent">{req.recommendation}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{req.importance}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="text-sm font-medium text-muted-foreground">Quick Wins</h3>
          <ul className="mt-2 space-y-1.5">
            {output.quickWins.map((w, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-success">✓</span> {w}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="text-sm font-medium text-muted-foreground">Longer-term Gaps</h3>
          <ul className="mt-2 space-y-1.5">
            {output.longerTermGaps.map((g, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-warning">→</span> {g}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {output.suggestedResources.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="font-semibold">Suggested Resources</h3>
          <div className="mt-3 space-y-2">
            {output.suggestedResources.map((r, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{r.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">({r.type})</span>
                <p className="text-xs text-muted-foreground">{r.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create interview prep output component**

```tsx
// components/journey/step-workspace/outputs/interview-prep-output.tsx
"use client";

import { useState } from "react";
import type { InterviewPrepOutput } from "@/lib/ai/schemas";

export function InterviewPrepOutputView({ output }: { output: InterviewPrepOutput }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm">{output.generalAdvice}</p>
      </div>

      <div className="space-y-3">
        {output.questions.map((q, i) => (
          <div key={i} className="rounded-xl border border-border bg-background">
            <button
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              className="flex w-full items-start justify-between p-4 text-left"
            >
              <div>
                <span className="text-xs font-medium text-accent">{q.category}</span>
                <p className="mt-0.5 text-sm font-medium">{q.question}</p>
              </div>
              <span className="text-muted-foreground">{expandedIndex === i ? "−" : "+"}</span>
            </button>
            {expandedIndex === i && (
              <div className="border-t border-border px-4 py-3 space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Why they ask this</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{q.whyTheyAsk}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Model answer</p>
                  <p className="mt-0.5 text-sm">{q.modelAnswer}</p>
                </div>
                {q.tips.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Tips</p>
                    <ul className="mt-1 space-y-1">
                      {q.tips.map((tip, j) => (
                        <li key={j} className="text-xs text-muted-foreground">• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {output.commonMistakes.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="text-sm font-medium text-muted-foreground">Common Mistakes to Avoid</h3>
          <ul className="mt-2 space-y-1.5">
            {output.commonMistakes.map((m, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-danger">✗</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create generic output component**

```tsx
// components/journey/step-workspace/outputs/generic-output.tsx
"use client";

export function GenericOutputView({ output }: { output: { content: string } }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="prose prose-sm max-w-none text-foreground">
        {output.content.split("\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add step output display components for CV, gap analysis, interview, and generic"
```

---

## Task 7: Streaming Chat Assistant

**Files:**
- Create: `app/api/ai/chat/route.ts`, `components/journey/step-workspace/chat-assistant.tsx`

- [ ] **Step 1: Create the streaming chat Route Handler**

```typescript
// app/api/ai/chat/route.ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: Request) {
  const { messages, systemPrompt } = await req.json();

  const result = streamText({
    model: openrouter.chat("google/gemini-2.5-flash"),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
```

- [ ] **Step 2: Create the chat assistant component**

```tsx
// components/journey/step-workspace/chat-assistant.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { Send, X, MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChatAssistantProps {
  systemPrompt: string;
  stepTitle: string;
}

export function ChatAssistant({ systemPrompt, stepTitle }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/ai/chat",
      body: { systemPrompt },
    });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-accent-foreground shadow-lg transition-transform hover:scale-105"
      >
        <MessageSquare className="h-4 w-4" />
        Ask Career Steer
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col rounded-2xl border border-border bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Career Steer Assistant</p>
          <p className="text-xs text-muted-foreground">{stepTitle}</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">
            Ask me anything about this step. I'm here to help.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[85%] rounded-xl px-3 py-2 text-sm",
              message.role === "user"
                ? "ml-auto bg-accent text-accent-foreground"
                : "bg-muted"
            )}
          >
            {message.content}
          </div>
        ))}
        {isLoading && (
          <div className="max-w-[85%] rounded-xl bg-muted px-3 py-2">
            <span className="text-sm text-muted-foreground animate-pulse">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-accent p-2 text-accent-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add streaming chat assistant with Route Handler and useChat"
```

---

## Task 8: Step Workspace Page

**Files:**
- Create: `components/journey/step-workspace/generate-button.tsx`, `components/journey/step-workspace/step-output.tsx`, `components/journey/step-workspace/index.tsx`, `app/(app)/journey/[journeyId]/step/[stepId]/page.tsx`

- [ ] **Step 1: Create the generate button**

```tsx
// components/journey/step-workspace/generate-button.tsx
"use client";

import { useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RotateCcw } from "lucide-react";

interface GenerateButtonProps {
  stepId: Id<"steps">;
  generationStatus: string;
}

export function GenerateButton({ stepId, generationStatus }: GenerateButtonProps) {
  const generateOutput = useAction(api.steps.generateStepOutput);

  const isGenerating = generationStatus === "generating";
  const hasFailed = generationStatus === "failed";
  const hasOutput = generationStatus === "completed";

  if (hasOutput) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => generateOutput({ stepId })}
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Regenerate
      </Button>
    );
  }

  return (
    <Button
      variant="accent"
      onClick={() => generateOutput({ stepId })}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : hasFailed ? (
        <>
          <RotateCcw className="mr-2 h-4 w-4" />
          Try again
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate with AI
        </>
      )}
    </Button>
  );
}
```

- [ ] **Step 2: Create the step output router**

```tsx
// components/journey/step-workspace/step-output.tsx
"use client";

import { CvRewriteOutputView } from "./outputs/cv-rewrite-output";
import { GapAnalysisOutputView } from "./outputs/gap-analysis-output";
import { InterviewPrepOutputView } from "./outputs/interview-prep-output";
import { GenericOutputView } from "./outputs/generic-output";

interface StepOutputProps {
  type: string;
  output: unknown;
}

export function StepOutput({ type, output }: StepOutputProps) {
  if (!output) return null;

  switch (type) {
    case "cv_rewrite":
      return <CvRewriteOutputView output={output as any} />;
    case "gap_analysis":
      return <GapAnalysisOutputView output={output as any} />;
    case "interview_prep":
      return <InterviewPrepOutputView output={output as any} />;
    default:
      if (typeof output === "object" && output !== null && "content" in output) {
        return <GenericOutputView output={output as { content: string }} />;
      }
      return (
        <div className="rounded-xl border border-border bg-background p-5">
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
        </div>
      );
  }
}
```

- [ ] **Step 3: Create the step workspace shell**

```tsx
// components/journey/step-workspace/index.tsx
"use client";

import { STEP_TYPES } from "@/lib/constants";
import { GenerateButton } from "./generate-button";
import { StepOutput } from "./step-output";
import { ChatAssistant } from "./chat-assistant";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { CheckCircle2 } from "lucide-react";

interface StepWorkspaceProps {
  step: {
    _id: Id<"steps">;
    type: keyof typeof STEP_TYPES;
    title: string;
    description: string;
    status: string;
    generationStatus: string;
    output: unknown;
  };
  chatSystemPrompt: string;
}

export function StepWorkspace({ step, chatSystemPrompt }: StepWorkspaceProps) {
  const updateStatus = useMutation(api.steps.updateStatus);

  const handleMarkComplete = async () => {
    await updateStatus({ stepId: step._id, status: "completed" });
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-medium text-accent">
          {STEP_TYPES[step.type]?.label}
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{step.title}</h1>
        <p className="mt-2 text-muted-foreground">{step.description}</p>
      </div>

      <div className="flex items-center gap-3">
        <GenerateButton stepId={step._id} generationStatus={step.generationStatus} />
        {step.status !== "completed" && step.generationStatus === "completed" && (
          <Button variant="secondary" onClick={handleMarkComplete}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Mark complete
          </Button>
        )}
        {step.status === "completed" && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </span>
        )}
      </div>

      {step.generationStatus === "failed" && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">
            Generation failed. Please try again.
          </p>
        </div>
      )}

      {step.output && <StepOutput type={step.type} output={step.output} />}

      <ChatAssistant systemPrompt={chatSystemPrompt} stepTitle={step.title} />
    </div>
  );
}
```

- [ ] **Step 4: Create the step workspace page**

```tsx
// app/(app)/journey/[journeyId]/step/[stepId]/page.tsx
"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { StepWorkspace } from "@/components/journey/step-workspace";
import { buildChatSystemPrompt } from "@/lib/ai/prompts";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function StepPage({
  params,
}: {
  params: Promise<{ journeyId: string; stepId: string }>;
}) {
  const { journeyId, stepId } = use(params);

  const step = useQuery(api.steps.getById, {
    stepId: stepId as Id<"steps">,
  });
  const journey = useQuery(api.journeys.getById, {
    journeyId: journeyId as Id<"journeys">,
  });
  const user = useQuery(api.users.getCurrentUser);

  if (step === undefined || journey === undefined || user === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!step || !journey) {
    return (
      <div className="py-12 text-centre">
        <p className="text-muted-foreground">Step not found.</p>
      </div>
    );
  }

  const chatSystemPrompt = buildChatSystemPrompt(
    user?.name ?? "there",
    { currentRole: user?.profile?.currentRole ?? "your current role" },
    journey.targetRole ?? "your target role",
    step.type,
    step.title,
    step.generationStatus === "completed"
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to dashboard
      </Link>
      <StepWorkspace step={step as any} chatSystemPrompt={chatSystemPrompt} />
    </div>
  );
}
```

- [ ] **Step 5: Verify the full flow**

```bash
npm run dev
```

1. Complete the diagnostic and create a journey (from Plan 2).
2. Navigate to the roadmap page — click "Generate my roadmap".
3. After generation, go to the dashboard — see current week's steps.
4. Click a step — step workspace loads.
5. Click "Generate with AI" — output appears.
6. Click "Ask Career Steer" — chat panel opens, send a message, see streamed response.
7. Click "Mark complete" — step status updates.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add step workspace with AI generation, output display, and chat assistant"
```

---

## Summary

After completing Plan 3, you have:

- **Roadmap generation** — Convex action creates a personalised week-by-week plan with milestones and steps
- **Journey dashboard** — shows active journey, current week's steps with progress bar
- **Roadmap view** — full milestone timeline with step statuses
- **Step workspace** — type-specific UI for each step with AI-generated outputs
- **Step output components** — rich displays for CV rewrite, gap analysis, interview prep, and generic text
- **Streaming AI assistant** — step-scoped chat via `useChat` + Next.js Route Handler
- **Step lifecycle** — generate → view output → mark complete

**Next plan:** Plan 4 — Progress & Completion (weekly check-ins, cron jobs, completion flow)
