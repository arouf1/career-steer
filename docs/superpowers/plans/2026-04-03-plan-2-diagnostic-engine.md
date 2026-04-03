# Career Steer — Plan 2: Diagnostic Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the diagnostic questionnaire, AI-powered analysis, results page with interactive Career Path Map (React Flow), and journey creation — so a user can sign up, answer questions, see their best next move, and start a journey.

**Architecture:** Multi-step form saves answers to Convex, triggers a Convex action that calls Gemini via AI SDK `generateObject` with a Zod schema, writes the analysis back to the DB. Results page reads the analysis reactively and renders an interactive Career Path Map using React Flow. User selects a target role, which creates a journey.

**Tech Stack:** Convex (mutations, queries, actions), Vercel AI SDK v6 + OpenRouter, Zod, React Flow (`@xyflow/react`), React state for multi-step form

**Depends on:** Plan 1 (Foundation) completed

---

## File Structure

```
app/(app)/
├── diagnostic/
│   ├── page.tsx                  — Multi-step questionnaire
│   └── results/
│       └── page.tsx              — Results page with Career Path Map
components/
├── diagnostic/
│   ├── questionnaire.tsx         — Multi-step form orchestrator
│   ├── steps/
│   │   ├── current-state.tsx     — Step 1: current role, experience, industry
│   │   ├── goal-state.tsx        — Step 2: what they want
│   │   ├── frictions.tsx         — Step 3: what's blocking them
│   │   ├── constraints.tsx       — Step 4: practical constraints
│   │   └── readiness.tsx         — Step 5: confidence and readiness
│   ├── processing-screen.tsx     — Loading state during AI analysis
│   ├── results-summary.tsx       — Analysis summary card
│   └── career-path-map.tsx       — React Flow career path visualisation
convex/
├── diagnostics.ts                — Diagnostic mutations, queries, and AI action
lib/
├── ai/
│   ├── prompts.ts                — Base persona and prompt builders
│   └── schemas.ts                — Zod schemas for AI outputs
```

---

## Task 1: Install React Flow and Add OpenRouter API Key

**Files:**
- Modify: `package.json`, `.env.local`

- [ ] **Step 1: Install React Flow**

```bash
npm install @xyflow/react
```

- [ ] **Step 2: Add OpenRouter API key to environment**

Get your API key from [openrouter.ai/keys](https://openrouter.ai/keys). Add to `.env.local`:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

Then add it to Convex environment variables so Convex actions can use it:

```bash
npx convex env set OPENROUTER_API_KEY sk-or-v1-...
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: install React Flow and configure OpenRouter API key"
```

---

## Task 2: Update Convex Schema for Path Map Data

**Files:**
- Modify: `convex/schema.ts`

The diagnostic analysis needs path map data for the React Flow visualisation. This extends the analysis object.

- [ ] **Step 1: Add pathMapData to the diagnostics analysis field**

In `convex/schema.ts`, replace the `analysis` field in the `diagnostics` table with:

```typescript
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
```

- [ ] **Step 2: Push schema update**

```bash
npx convex dev --once
```

Expected: Schema updates successfully.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add pathMapData to diagnostic analysis schema"
```

---

## Task 3: AI Prompts and Zod Schemas

**Files:**
- Create: `lib/ai/prompts.ts`, `lib/ai/schemas.ts`

- [ ] **Step 1: Create the base persona and prompt builders**

```typescript
// lib/ai/prompts.ts

export const BASE_PERSONA = `You are Career Steer, an AI career adviser.

Tone: calm, direct, practical. Never patronising. Never vague.
You speak in British English.

Rules:
- Always ground advice in the user's actual experience and constraints.
- Never invent qualifications or experience the user hasn't mentioned.
- When uncertain, say so and explain the trade-offs.
- Prefer concrete actions over abstract guidance.
- Reference specific roles, skills, and industries — not generalities.
- Keep outputs concise. Respect the user's time.`;

export function buildDiagnosticPrompt(
  userName: string,
  profile: {
    currentRole: string;
    experienceLevel: string;
    industry: string;
    salaryBand: string;
    location: string;
    education: string;
  },
  answers: {
    goalState: string;
    frictions: string[];
    constraints: {
      hoursPerWeek: number;
      salaryFloor: number;
      urgency: string;
      willingnessToRetrain: boolean;
    };
    confidence: string;
  }
): string {
  return `${BASE_PERSONA}

The user's name is ${userName}.

You are analysing a career diagnostic for this user. Based on their profile and answers, produce a thorough career analysis.

USER PROFILE:
- Current role: ${profile.currentRole}
- Experience level: ${profile.experienceLevel}
- Industry: ${profile.industry}
- Salary band: ${profile.salaryBand}
- Location: ${profile.location}
- Education: ${profile.education}

DIAGNOSTIC ANSWERS:
- Goal: ${answers.goalState}
- Frictions: ${answers.frictions.join(", ")}
- Hours available per week: ${answers.constraints.hoursPerWeek}
- Minimum acceptable salary: £${answers.constraints.salaryFloor.toLocaleString()}
- Urgency: ${answers.constraints.urgency}
- Willing to retrain: ${answers.constraints.willingnessToRetrain ? "Yes" : "No"}
- Confidence level: ${answers.confidence}

INSTRUCTIONS:
1. Recommend one of four lanes: career_switch, promotion, job_search, or career_clarity.
2. Identify their top 3-5 transferable strengths based on their role and experience.
3. Identify 2-4 key blockers based on their frictions and constraints.
4. Suggest exactly 3 realistic target roles they could pursue, ordered by fit.
5. Give a feasibility score from 0-100 for their overall career move.
6. Write a 2-3 sentence personalised summary addressing them by name.
7. For each suggested role, provide path map data:
   - A fit score (0-100) specific to that role
   - A realistic salary range for that role in their location
   - A timeline estimate (e.g. "3-6 months")
   - 3-5 bridge skills needed, each rated as "strong" (they have it), "partial" (some evidence), or "gap" (they need to develop it)

Be honest. If a transition is unrealistic in their stated timeline, say so and suggest a more realistic intermediate step. Never fake optimism.`;
}
```

- [ ] **Step 2: Create the Zod schemas for AI outputs**

```typescript
// lib/ai/schemas.ts
import { z } from "zod";

export const diagnosticAnalysisSchema = z.object({
  recommendedLane: z.enum([
    "career_switch",
    "promotion",
    "job_search",
    "career_clarity",
  ]),
  topStrengths: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("Top 3-5 transferable strengths"),
  keyBlockers: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe("Key 2-4 blockers or friction points"),
  suggestedRoles: z
    .array(z.string())
    .length(3)
    .describe("Exactly 3 realistic target roles, ordered by fit"),
  feasibilityScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall feasibility score"),
  summary: z
    .string()
    .describe("2-3 sentence personalised summary addressing the user by name"),
  pathMapData: z.array(
    z.object({
      targetRole: z.string(),
      fitScore: z.number().min(0).max(100),
      salaryRange: z.string().describe("e.g. £35,000 - £45,000"),
      timelineEstimate: z.string().describe("e.g. 3-6 months"),
      bridgeSkills: z.array(
        z.object({
          skill: z.string(),
          level: z.enum(["strong", "partial", "gap"]),
        })
      ),
    })
  ),
});

export type DiagnosticAnalysis = z.infer<typeof diagnosticAnalysisSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add AI prompt builders and Zod schemas for diagnostic analysis"
```

---

## Task 4: Convex Diagnostic Functions

**Files:**
- Create: `convex/diagnostics.ts`

- [ ] **Step 1: Create diagnostic mutations, queries, and AI action**

```typescript
// convex/diagnostics.ts
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

export const saveDiagnostic = mutation({
  args: {
    profile: v.object({
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { profile: args.profile });

    const diagnosticId = await ctx.db.insert("diagnostics", {
      userId: user._id,
      completedAt: Date.now(),
      answers: args.answers,
      analysis: null,
    });

    return diagnosticId;
  },
});

export const generateAnalysis = action({
  args: { diagnosticId: v.id("diagnostics") },
  handler: async (ctx, args) => {
    const { createOpenRouter } = await import(
      "@openrouter/ai-sdk-provider"
    );
    const { generateObject } = await import("ai");

    const diagnostic = await ctx.runQuery(api.diagnostics.getById, {
      diagnosticId: args.diagnosticId,
    });
    if (!diagnostic) throw new Error("Diagnostic not found");

    const user = await ctx.runQuery(api.users.getById, {
      userId: diagnostic.userId,
    });
    if (!user || !user.profile) throw new Error("User profile not found");

    const { buildDiagnosticPrompt } = await import("../lib/ai/prompts");
    const { diagnosticAnalysisSchema } = await import("../lib/ai/schemas");

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const { object } = await generateObject({
      model: openrouter.chat("google/gemini-2.5-pro"),
      schema: diagnosticAnalysisSchema,
      prompt: buildDiagnosticPrompt(user.name, user.profile, diagnostic.answers),
    });

    await ctx.runMutation(api.diagnostics.saveAnalysis, {
      diagnosticId: args.diagnosticId,
      analysis: object,
    });

    return object;
  },
});

export const saveAnalysis = mutation({
  args: {
    diagnosticId: v.id("diagnostics"),
    analysis: v.object({
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.diagnosticId, { analysis: args.analysis });
  },
});

export const getById = query({
  args: { diagnosticId: v.id("diagnostics") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.diagnosticId);
  },
});

export const getLatestForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const diagnostics = await ctx.db
      .query("diagnostics")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(1);

    return diagnostics[0] ?? null;
  },
});
```

- [ ] **Step 2: Add the `getById` query to users.ts**

Add this query to `convex/users.ts`:

```typescript
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
```

- [ ] **Step 3: Push functions to Convex**

```bash
npx convex dev --once
```

Expected: All functions deploy successfully.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add Convex diagnostic functions with AI analysis action"
```

---

## Task 5: Questionnaire Step Components

**Files:**
- Create: `components/diagnostic/steps/current-state.tsx`, `components/diagnostic/steps/goal-state.tsx`, `components/diagnostic/steps/frictions.tsx`, `components/diagnostic/steps/constraints.tsx`, `components/diagnostic/steps/readiness.tsx`

- [ ] **Step 1: Create the CurrentState step (Step 1/5)**

```tsx
// components/diagnostic/steps/current-state.tsx
"use client";

import { Button } from "@/components/ui/button";

interface CurrentStateData {
  currentRole: string;
  experienceLevel: "early" | "mid" | "senior";
  industry: string;
  salaryBand: string;
  location: string;
  education: string;
}

interface CurrentStateProps {
  data: CurrentStateData;
  onChange: (data: CurrentStateData) => void;
  onNext: () => void;
}

const experienceLevels = [
  { value: "early" as const, label: "Early career (0-3 years)" },
  { value: "mid" as const, label: "Mid-career (3-10 years)" },
  { value: "senior" as const, label: "Senior (10+ years)" },
];

export function CurrentState({ data, onChange, onNext }: CurrentStateProps) {
  const update = (field: keyof CurrentStateData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const isValid =
    data.currentRole.trim() !== "" &&
    data.experienceLevel !== ("" as "early") &&
    data.industry.trim() !== "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Tell us about where you are now</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This helps us understand your starting point.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Current job title or role
          </label>
          <input
            type="text"
            value={data.currentRole}
            onChange={(e) => update("currentRole", e.target.value)}
            placeholder="e.g. Customer Support Manager"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Experience level
          </label>
          <div className="grid gap-2">
            {experienceLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => update("experienceLevel", level.value)}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  data.experienceLevel === level.value
                    ? "border-accent bg-accent/5 text-foreground"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Industry</label>
          <input
            type="text"
            value={data.industry}
            onChange={(e) => update("industry", e.target.value)}
            placeholder="e.g. Technology, Healthcare, Finance"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Current salary band
          </label>
          <input
            type="text"
            value={data.salaryBand}
            onChange={(e) => update("salaryBand", e.target.value)}
            placeholder="e.g. £30,000 - £40,000"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Location</label>
          <input
            type="text"
            value={data.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="e.g. London, UK"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Education</label>
          <input
            type="text"
            value={data.education}
            onChange={(e) => update("education", e.target.value)}
            placeholder="e.g. BSc Computer Science, A-levels, Self-taught"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <Button variant="accent" onClick={onNext} disabled={!isValid}>
        Continue
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create the GoalState step (Step 2/5)**

```tsx
// components/diagnostic/steps/goal-state.tsx
"use client";

import { Button } from "@/components/ui/button";

const goals = [
  {
    value: "career_switch" as const,
    label: "I want to switch careers",
    description: "Move into a completely different role or field",
  },
  {
    value: "promotion" as const,
    label: "I want to get promoted",
    description: "Level up in my current company or field",
  },
  {
    value: "new_job" as const,
    label: "I want a new job",
    description: "Same kind of role, but at a different company",
  },
  {
    value: "new_direction" as const,
    label: "I want a new direction",
    description: "I know I want change, but I'm not sure what kind",
  },
  {
    value: "not_sure" as const,
    label: "I'm not sure yet",
    description: "I just know something needs to change",
  },
];

type GoalState = "new_job" | "promotion" | "new_direction" | "career_switch" | "not_sure";

interface GoalStateProps {
  data: GoalState;
  onChange: (data: GoalState) => void;
  onNext: () => void;
  onBack: () => void;
}

export function GoalState({ data, onChange, onNext, onBack }: GoalStateProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">What are you looking for?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the option that feels closest. You can always refine later.
        </p>
      </div>

      <div className="grid gap-2">
        {goals.map((goal) => (
          <button
            key={goal.value}
            onClick={() => onChange(goal.value)}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              data === goal.value
                ? "border-accent bg-accent/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <span className="text-sm font-medium">{goal.label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {goal.description}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button variant="accent" onClick={onNext} disabled={!data}>
          Continue
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the Frictions step (Step 3/5)**

```tsx
// components/diagnostic/steps/frictions.tsx
"use client";

import { Button } from "@/components/ui/button";

const frictionOptions = [
  { id: "not_getting_interviews", label: "Not getting interviews" },
  { id: "unclear_path", label: "Don't know the best path forward" },
  { id: "underqualified", label: "Feel underqualified for target roles" },
  { id: "low_confidence", label: "Low confidence or imposter syndrome" },
  { id: "burnout", label: "Burned out or exhausted" },
  { id: "poor_manager", label: "Poor manager or workplace politics" },
  { id: "unclear_positioning", label: "Don't know how to position myself" },
  { id: "no_network", label: "Weak professional network" },
  { id: "salary_stuck", label: "Salary feels stuck" },
  { id: "skills_outdated", label: "Skills feel outdated" },
];

interface FrictionsProps {
  data: string[];
  onChange: (data: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Frictions({ data, onChange, onNext, onBack }: FrictionsProps) {
  const toggle = (id: string) => {
    onChange(
      data.includes(id) ? data.filter((f) => f !== id) : [...data, id]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">What feels like it's in the way?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select all that apply. There are no wrong answers.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {frictionOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => toggle(option.id)}
            className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              data.includes(option.id)
                ? "border-accent bg-accent/5 text-foreground"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="accent"
          onClick={onNext}
          disabled={data.length === 0}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the Constraints step (Step 4/5)**

```tsx
// components/diagnostic/steps/constraints.tsx
"use client";

import { Button } from "@/components/ui/button";

interface ConstraintsData {
  hoursPerWeek: number;
  salaryFloor: number;
  urgency: "low" | "medium" | "high";
  willingnessToRetrain: boolean;
}

interface ConstraintsProps {
  data: ConstraintsData;
  onChange: (data: ConstraintsData) => void;
  onNext: () => void;
  onBack: () => void;
}

const urgencyOptions = [
  { value: "low" as const, label: "No rush — I'm exploring" },
  { value: "medium" as const, label: "Within the next 6 months" },
  { value: "high" as const, label: "As soon as possible" },
];

export function Constraints({ data, onChange, onNext, onBack }: ConstraintsProps) {
  const update = <K extends keyof ConstraintsData>(
    field: K,
    value: ConstraintsData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">What are your practical constraints?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This helps us create a realistic plan that fits your life.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Hours you can dedicate per week to career development
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={20}
              value={data.hoursPerWeek}
              onChange={(e) => update("hoursPerWeek", Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-20 text-sm font-medium">
              {data.hoursPerWeek} hrs/wk
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Minimum acceptable salary (£)
          </label>
          <input
            type="number"
            value={data.salaryFloor || ""}
            onChange={(e) => update("salaryFloor", Number(e.target.value))}
            placeholder="e.g. 30000"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            How urgently do you want to make a move?
          </label>
          <div className="grid gap-2">
            {urgencyOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => update("urgency", option.value)}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  data.urgency === option.value
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Are you willing to retrain or learn new skills?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => update("willingnessToRetrain", true)}
              className={`rounded-lg border px-4 py-3 text-sm transition-colors ${
                data.willingnessToRetrain
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              Yes, I'm open to it
            </button>
            <button
              onClick={() => update("willingnessToRetrain", false)}
              className={`rounded-lg border px-4 py-3 text-sm transition-colors ${
                !data.willingnessToRetrain
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              Prefer not to
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button variant="accent" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create the Readiness step (Step 5/5)**

```tsx
// components/diagnostic/steps/readiness.tsx
"use client";

import { Button } from "@/components/ui/button";

const confidenceLevels = [
  {
    value: "low" as const,
    label: "Low",
    description: "I feel quite uncertain about my next steps",
  },
  {
    value: "medium" as const,
    label: "Medium",
    description: "I have some idea, but need guidance and structure",
  },
  {
    value: "high" as const,
    label: "High",
    description: "I know roughly what I want, I just need a plan",
  },
];

interface ReadinessProps {
  data: "low" | "medium" | "high";
  onChange: (data: "low" | "medium" | "high") => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function Readiness({
  data,
  onChange,
  onSubmit,
  onBack,
  isSubmitting,
}: ReadinessProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">How confident are you feeling?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Be honest — there's no wrong answer. This helps us calibrate your plan.
        </p>
      </div>

      <div className="grid gap-2">
        {confidenceLevels.map((level) => (
          <button
            key={level.value}
            onClick={() => onChange(level.value)}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              data === level.value
                ? "border-accent bg-accent/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <span className="text-sm font-medium">{level.label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {level.description}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button
          variant="accent"
          onClick={onSubmit}
          disabled={!data || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Get my analysis"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add all five diagnostic questionnaire step components"
```

---

## Task 6: Questionnaire Orchestrator and Page

**Files:**
- Create: `components/diagnostic/questionnaire.tsx`, `components/diagnostic/processing-screen.tsx`, `app/(app)/diagnostic/page.tsx`

- [ ] **Step 1: Create the processing screen**

```tsx
// components/diagnostic/processing-screen.tsx
"use client";

import { Loader2 } from "lucide-react";

export function ProcessingScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <h2 className="mt-6 text-xl font-semibold">Analysing your career profile</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        We're mapping your strengths, identifying realistic target roles, and
        building your options. This usually takes 10-15 seconds.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create the questionnaire orchestrator**

```tsx
// components/diagnostic/questionnaire.tsx
"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useRouter } from "next/navigation";
import { CurrentState } from "./steps/current-state";
import { GoalState } from "./steps/goal-state";
import { Frictions } from "./steps/frictions";
import { Constraints } from "./steps/constraints";
import { Readiness } from "./steps/readiness";
import { ProcessingScreen } from "./processing-screen";

const TOTAL_STEPS = 5;

interface FormData {
  profile: {
    currentRole: string;
    experienceLevel: "early" | "mid" | "senior";
    industry: string;
    salaryBand: string;
    location: string;
    education: string;
  };
  goalState: "new_job" | "promotion" | "new_direction" | "career_switch" | "not_sure";
  frictions: string[];
  constraints: {
    hoursPerWeek: number;
    salaryFloor: number;
    urgency: "low" | "medium" | "high";
    willingnessToRetrain: boolean;
  };
  confidence: "low" | "medium" | "high";
}

export function Questionnaire() {
  const router = useRouter();
  const saveDiagnostic = useMutation(api.diagnostics.saveDiagnostic);
  const generateAnalysis = useAction(api.diagnostics.generateAnalysis);

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    profile: {
      currentRole: "",
      experienceLevel: "mid",
      industry: "",
      salaryBand: "",
      location: "",
      education: "",
    },
    goalState: "" as FormData["goalState"],
    frictions: [],
    constraints: {
      hoursPerWeek: 5,
      salaryFloor: 0,
      urgency: "medium",
      willingnessToRetrain: true,
    },
    confidence: "" as FormData["confidence"],
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const diagnosticId = await saveDiagnostic({
        profile: formData.profile,
        answers: {
          goalState: formData.goalState,
          frictions: formData.frictions,
          constraints: formData.constraints,
          confidence: formData.confidence,
        },
      });

      setIsProcessing(true);
      await generateAnalysis({ diagnosticId });
      router.push("/diagnostic/results");
    } catch (error) {
      console.error("Failed to generate analysis:", error);
      setIsSubmitting(false);
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return <ProcessingScreen />;
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Step {step + 1} of {TOTAL_STEPS}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {step === 0 && (
        <CurrentState
          data={formData.profile}
          onChange={(profile) => setFormData((prev) => ({ ...prev, profile }))}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <GoalState
          data={formData.goalState}
          onChange={(goalState) =>
            setFormData((prev) => ({ ...prev, goalState }))
          }
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <Frictions
          data={formData.frictions}
          onChange={(frictions) =>
            setFormData((prev) => ({ ...prev, frictions }))
          }
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <Constraints
          data={formData.constraints}
          onChange={(constraints) =>
            setFormData((prev) => ({ ...prev, constraints }))
          }
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <Readiness
          data={formData.confidence}
          onChange={(confidence) =>
            setFormData((prev) => ({ ...prev, confidence }))
          }
          onSubmit={handleSubmit}
          onBack={() => setStep(3)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the diagnostic page**

```tsx
// app/(app)/diagnostic/page.tsx
import { Questionnaire } from "@/components/diagnostic/questionnaire";

export default function DiagnosticPage() {
  return (
    <div className="py-8">
      <Questionnaire />
    </div>
  );
}
```

- [ ] **Step 4: Verify the questionnaire renders**

```bash
npm run dev
```

Sign in and navigate to `/diagnostic`. Expected: Multi-step form renders with progress bar. Navigate through all 5 steps. The submit button on step 5 should trigger the save + AI analysis flow.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add diagnostic questionnaire with multi-step form and AI analysis trigger"
```

---

## Task 7: Career Path Map (React Flow)

**Files:**
- Create: `components/diagnostic/career-path-map.tsx`

- [ ] **Step 1: Create the Career Path Map component**

```tsx
// components/diagnostic/career-path-map.tsx
"use client";

import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback } from "react";

interface PathMapRole {
  targetRole: string;
  fitScore: number;
  salaryRange: string;
  timelineEstimate: string;
  bridgeSkills: { skill: string; level: "strong" | "partial" | "gap" }[];
}

interface CareerPathMapProps {
  currentRole: string;
  pathMapData: PathMapRole[];
  selectedRole: string | null;
  onSelectRole: (role: string) => void;
}

const LEVEL_COLOURS = {
  strong: "#16A34A",
  partial: "#D97706",
  gap: "#DC2626",
};

function CurrentRoleNode({ data }: { data: { label: string } }) {
  return (
    <div className="rounded-xl border-2 border-foreground bg-background px-5 py-3 shadow-sm">
      <p className="text-xs text-muted-foreground">You are here</p>
      <p className="font-semibold">{data.label}</p>
    </div>
  );
}

function BridgeSkillNode({
  data,
}: {
  data: { label: string; level: "strong" | "partial" | "gap" };
}) {
  return (
    <div
      className="rounded-lg border bg-background px-3 py-1.5 text-xs shadow-sm"
      style={{ borderColor: LEVEL_COLOURS[data.level] }}
    >
      <span
        className="mr-1.5 inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: LEVEL_COLOURS[data.level] }}
      />
      {data.label}
    </div>
  );
}

function TargetRoleNode({
  data,
}: {
  data: {
    label: string;
    fitScore: number;
    salaryRange: string;
    timeline: string;
    selected: boolean;
    onClick: () => void;
  };
}) {
  return (
    <button
      onClick={data.onClick}
      className={`rounded-xl border-2 bg-background px-5 py-3 text-left shadow-sm transition-all hover:shadow-md ${
        data.selected ? "border-accent ring-2 ring-accent/20" : "border-border"
      }`}
    >
      <p className="font-semibold">{data.label}</p>
      <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
        <p>
          Fit:{" "}
          <span className="font-medium text-foreground">{data.fitScore}%</span>
        </p>
        <p>{data.salaryRange}</p>
        <p>{data.timeline}</p>
      </div>
    </button>
  );
}

const nodeTypes = {
  currentRole: CurrentRoleNode,
  bridgeSkill: BridgeSkillNode,
  targetRole: TargetRoleNode,
};

export function CareerPathMap({
  currentRole,
  pathMapData,
  selectedRole,
  onSelectRole,
}: CareerPathMapProps) {
  const buildNodesAndEdges = useCallback(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    nodes.push({
      id: "current",
      type: "currentRole",
      position: { x: 0, y: 200 },
      data: { label: currentRole },
      sourcePosition: Position.Right,
    });

    pathMapData.forEach((role, roleIndex) => {
      const roleX = 500;
      const roleY = roleIndex * 200;
      const roleId = `target-${roleIndex}`;

      nodes.push({
        id: roleId,
        type: "targetRole",
        position: { x: roleX, y: roleY },
        data: {
          label: role.targetRole,
          fitScore: role.fitScore,
          salaryRange: role.salaryRange,
          timeline: role.timelineEstimate,
          selected: selectedRole === role.targetRole,
          onClick: () => onSelectRole(role.targetRole),
        },
        targetPosition: Position.Left,
      });

      role.bridgeSkills.forEach((skill, skillIndex) => {
        const skillId = `skill-${roleIndex}-${skillIndex}`;
        const skillX = 250;
        const skillY =
          roleY - 30 + skillIndex * 35;

        nodes.push({
          id: skillId,
          type: "bridgeSkill",
          position: { x: skillX, y: skillY },
          data: { label: skill.skill, level: skill.level },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });

        edges.push({
          id: `current-${skillId}`,
          source: "current",
          target: skillId,
          style: { stroke: LEVEL_COLOURS[skill.level], strokeWidth: 1.5 },
        });

        edges.push({
          id: `${skillId}-${roleId}`,
          source: skillId,
          target: roleId,
          style: { stroke: LEVEL_COLOURS[skill.level], strokeWidth: 1.5 },
        });
      });
    });

    return { nodes, edges };
  }, [currentRole, pathMapData, selectedRole, onSelectRole]);

  const { nodes, edges } = buildNodesAndEdges();

  return (
    <div className="h-[450px] w-full rounded-xl border border-border bg-muted/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#E7E5E4" />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add Career Path Map component with React Flow"
```

---

## Task 8: Results Page

**Files:**
- Create: `components/diagnostic/results-summary.tsx`, `app/(app)/diagnostic/results/page.tsx`
- Create: `convex/journeys.ts`

- [ ] **Step 1: Create the results summary component**

```tsx
// components/diagnostic/results-summary.tsx
"use client";

import { JOURNEY_LANES } from "@/lib/constants";

interface ResultsSummaryProps {
  analysis: {
    recommendedLane: keyof typeof JOURNEY_LANES;
    topStrengths: string[];
    keyBlockers: string[];
    feasibilityScore: number;
    summary: string;
  };
}

export function ResultsSummary({ analysis }: ResultsSummaryProps) {
  const lane = JOURNEY_LANES[analysis.recommendedLane];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-background p-6">
        <p className="text-sm text-muted-foreground">Your best next move</p>
        <h2 className="mt-1 text-2xl font-bold">{lane.label}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{analysis.summary}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Feasibility
          </p>
          <p className="mt-1 text-2xl font-bold">{analysis.feasibilityScore}%</p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Top strengths
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {analysis.topStrengths.map((s) => (
              <span
                key={s}
                className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Key blockers
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {analysis.keyBlockers.map((b) => (
              <span
                key={b}
                className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the journey creation mutation**

```typescript
// convex/journeys.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    diagnosticId: v.id("diagnostics"),
    lane: v.union(
      v.literal("career_switch"),
      v.literal("promotion"),
      v.literal("job_search"),
      v.literal("career_clarity")
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
        q.eq("userId", user._id).eq("status", "active")
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
        q.eq("userId", user._id).eq("status", "active")
      )
      .unique();
  },
});
```

- [ ] **Step 3: Create the results page**

```tsx
// app/(app)/diagnostic/results/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useRouter } from "next/navigation";
import { ResultsSummary } from "@/components/diagnostic/results-summary";
import { CareerPathMap } from "@/components/diagnostic/career-path-map";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { JOURNEY_LANES } from "@/lib/constants";

export default function DiagnosticResultsPage() {
  const router = useRouter();
  const diagnostic = useQuery(api.diagnostics.getLatestForUser);
  const user = useQuery(api.users.getCurrentUser);
  const createJourney = useMutation(api.journeys.create);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (diagnostic === undefined || user === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!diagnostic?.analysis) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          No analysis found. Please complete the diagnostic first.
        </p>
        <Button
          variant="accent"
          className="mt-4"
          onClick={() => router.push("/diagnostic")}
        >
          Start diagnostic
        </Button>
      </div>
    );
  }

  const { analysis } = diagnostic;

  const handleStartJourney = async () => {
    if (!selectedRole) return;
    setIsCreating(true);
    try {
      const journeyId = await createJourney({
        diagnosticId: diagnostic._id,
        lane: analysis.recommendedLane,
        targetRole: selectedRole,
      });
      router.push(`/journey/${journeyId}/roadmap`);
    } catch (error) {
      console.error("Failed to create journey:", error);
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {user?.name ? `${user.name}, here's` : "Here's"} your career analysis
        </h1>
        <p className="mt-1 text-muted-foreground">
          Based on your answers, we've mapped out your best options.
        </p>
      </div>

      <ResultsSummary analysis={analysis} />

      <div>
        <h3 className="text-lg font-semibold">Your career path options</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Click a target role to select it, then start your journey.
        </p>
        <div className="mt-4">
          <CareerPathMap
            currentRole={user?.profile?.currentRole ?? "Current Role"}
            pathMapData={analysis.pathMapData}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
          />
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            Strong skill
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" />
            Partial skill
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" />
            Skill gap
          </span>
        </div>
      </div>

      {selectedRole && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-6">
          <p className="font-medium">
            Ready to pursue{" "}
            <span className="text-accent">{selectedRole}</span>?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            We'll create a personalised{" "}
            {JOURNEY_LANES[analysis.recommendedLane].label} roadmap to get you
            there.
          </p>
          <Button
            variant="accent"
            className="mt-4"
            onClick={handleStartJourney}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating journey...
              </>
            ) : (
              <>
                Start this journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Push Convex functions**

```bash
npx convex dev --once
```

Expected: All functions deploy successfully.

- [ ] **Step 5: Verify the full diagnostic flow**

```bash
npm run dev
```

1. Sign in and go to `/diagnostic`.
2. Complete all 5 steps.
3. Submit — see the processing screen.
4. After AI analysis completes, you should be redirected to `/diagnostic/results`.
5. Results page shows: summary card, strengths/blockers, feasibility score, Career Path Map.
6. Click a target role in the map — it highlights.
7. "Start this journey" button appears.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add diagnostic results page with Career Path Map and journey creation"
```

---

## Summary

After completing Plan 2, you have:

- **Diagnostic questionnaire** — 5-step conversational form with progress bar
- **AI analysis engine** — Convex action using AI SDK + Gemini via OpenRouter with structured Zod output
- **Results page** — personalised summary, strengths/blockers, feasibility score
- **Career Path Map** — interactive React Flow visualisation showing current role → bridge skills → target roles
- **Journey creation** — user selects a target role and starts a journey
- **Prompt architecture** — base persona, diagnostic prompt builder, and Zod schemas established

**Next plan:** Plan 3 — Journey & Execution (roadmap generation, dashboard, step workspace, AI assistant)
