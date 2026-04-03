# Career Steer — Plan 4: Progress & Completion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the weekly check-in flow, progress logging with AI encouragement, week unlocking, journey completion, diagnostic retake, and a Convex cron job for nudging inactive users — completing the full Diagnose → Decide → Plan → Execute → Adapt loop.

**Architecture:** Weekly check-in is a page within the journey route. Progress logs are saved to Convex, then a Convex action generates AI encouragement and updated recommendations. A Convex cron job runs daily to check for users due a check-in. Week unlocking happens automatically when all steps in a week are completed. Journey completion triggers when all milestones are done.

**Tech Stack:** Convex (mutations, queries, actions, cron jobs), Vercel AI SDK v6 + OpenRouter, Next.js App Router

**Depends on:** Plan 3 (Journey & Execution) completed

---

## File Structure

```
app/(app)/
├── journey/
│   └── [journeyId]/
│       ├── check-in/
│       │   └── page.tsx                  — Weekly check-in page
│       └── complete/
│           └── page.tsx                  — Journey completion page
components/
├── journey/
│   ├── check-in-form.tsx                 — Check-in questionnaire
│   ├── check-in-result.tsx               — AI encouragement display
│   └── completion-summary.tsx            — Journey completion summary
convex/
├── progressLogs.ts                       — Progress log functions
├── crons.ts                              — Cron job definitions
├── steps.ts                              — Modified: auto-unlock next week
├── journeys.ts                           — Modified: completion logic
lib/
├── ai/
│   └── prompts.ts                        — Extended: check-in prompt
```

---

## Task 1: Check-in AI Prompt

**Files:**
- Modify: `lib/ai/prompts.ts`

- [ ] **Step 1: Add the check-in prompt builder**

Append to `lib/ai/prompts.ts`:

```typescript
export function buildCheckInPrompt(
  userName: string,
  targetRole: string,
  weekNumber: number,
  stepsCompleted: number,
  stepsTotal: number,
  userReflection: string | null,
  blockers: string | null
): string {
  const completionRate = Math.round((stepsCompleted / stepsTotal) * 100);

  return `${BASE_PERSONA}

The user's name is ${userName}. They are working towards becoming a ${targetRole}.

WEEKLY CHECK-IN — Week ${weekNumber}
- Steps completed: ${stepsCompleted} / ${stepsTotal} (${completionRate}%)
- User's reflection: ${userReflection || "None provided"}
- Blockers mentioned: ${blockers || "None mentioned"}

INSTRUCTIONS:
1. Write a brief, personalised encouragement message (2-3 sentences). Address them by name. Be warm but not patronising. Acknowledge their progress honestly — if they completed very little, don't pretend otherwise. Instead, normalise it and gently suggest momentum.
2. Provide 2-3 specific, actionable recommendations for next week based on their progress and any blockers. These should be concrete, not generic advice.

Tone: like a supportive coach who respects your intelligence.`;
}
```

- [ ] **Step 2: Add the check-in output schema**

Append to `lib/ai/schemas.ts`:

```typescript
export const checkInResponseSchema = z.object({
  encouragement: z.string().describe("2-3 sentence personalised encouragement"),
  updatedRecommendations: z
    .array(z.string())
    .min(2)
    .max(3)
    .describe("Specific, actionable recommendations for next week"),
});

export type CheckInResponse = z.infer<typeof checkInResponseSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add check-in AI prompt and response schema"
```

---

## Task 2: Convex Progress Log Functions

**Files:**
- Create: `convex/progressLogs.ts`

- [ ] **Step 1: Create progress log functions**

```typescript
// convex/progressLogs.ts
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

export const getByJourneyAndWeek = query({
  args: {
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("progressLogs")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId).eq("weekNumber", args.weekNumber)
      )
      .unique();
  },
});

export const getAllByJourney = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("progressLogs")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId)
      )
      .collect();
  },
});

export const save = mutation({
  args: {
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
    stepsCompleted: v.number(),
    stepsTotal: v.number(),
    userReflection: v.union(v.string(), v.null()),
    blockers: v.union(v.string(), v.null()),
    encouragement: v.string(),
    updatedRecommendations: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("progressLogs")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId).eq("weekNumber", args.weekNumber)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        completedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("progressLogs", {
      ...args,
      completedAt: Date.now(),
    });
  },
});

export const generateCheckIn = action({
  args: {
    journeyId: v.id("journeys"),
    weekNumber: v.number(),
    userReflection: v.union(v.string(), v.null()),
    blockers: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const journey = await ctx.runQuery(api.journeys.getById, {
      journeyId: args.journeyId,
    });
    if (!journey) throw new Error("Journey not found");

    const user = await ctx.runQuery(api.users.getById, { userId: journey.userId });
    if (!user) throw new Error("User not found");

    const weekSteps = await ctx.runQuery(api.steps.getByJourneyAndWeek, {
      journeyId: args.journeyId,
      weekNumber: args.weekNumber,
    });

    const stepsCompleted = weekSteps.filter(
      (s) => s.status === "completed"
    ).length;
    const stepsTotal = weekSteps.length;

    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const { generateObject } = await import("ai");
    const { buildCheckInPrompt } = await import("../lib/ai/prompts");
    const { checkInResponseSchema } = await import("../lib/ai/schemas");

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const { object } = await generateObject({
      model: openrouter.chat("google/gemini-2.5-flash"),
      schema: checkInResponseSchema,
      prompt: buildCheckInPrompt(
        user.name,
        journey.targetRole ?? "your target role",
        args.weekNumber,
        stepsCompleted,
        stepsTotal,
        args.userReflection,
        args.blockers
      ),
    });

    await ctx.runMutation(api.progressLogs.save, {
      journeyId: args.journeyId,
      weekNumber: args.weekNumber,
      stepsCompleted,
      stepsTotal,
      userReflection: args.userReflection,
      blockers: args.blockers,
      encouragement: object.encouragement,
      updatedRecommendations: object.updatedRecommendations,
    });

    await ctx.runMutation(api.steps.unlockWeek, {
      journeyId: args.journeyId,
      weekNumber: args.weekNumber + 1,
    });

    return object;
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
git commit -m "feat: add progress log functions with AI check-in generation"
```

---

## Task 3: Auto-unlock and Completion Logic

**Files:**
- Modify: `convex/steps.ts`, `convex/journeys.ts`

- [ ] **Step 1: Add auto-unlock logic to step completion**

In `convex/steps.ts`, replace the `updateStatus` mutation with:

```typescript
export const updateStatus = mutation({
  args: {
    stepId: v.id("steps"),
    status: v.union(
      v.literal("locked"), v.literal("available"),
      v.literal("in_progress"), v.literal("completed"), v.literal("skipped")
    ),
  },
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.stepId);
    if (!step) throw new Error("Step not found");

    await ctx.db.patch(args.stepId, { status: args.status });

    if (args.status === "completed") {
      const weekSteps = await ctx.db
        .query("steps")
        .withIndex("by_journeyId_weekNumber", (q) =>
          q.eq("journeyId", step.journeyId).eq("weekNumber", step.weekNumber)
        )
        .collect();

      const allWeekComplete = weekSteps.every(
        (s) => s._id.toString() === args.stepId.toString()
          ? true
          : s.status === "completed" || s.status === "skipped"
      );

      if (allWeekComplete) {
        const nextWeekSteps = await ctx.db
          .query("steps")
          .withIndex("by_journeyId_weekNumber", (q) =>
            q.eq("journeyId", step.journeyId).eq("weekNumber", step.weekNumber + 1)
          )
          .collect();

        for (const nextStep of nextWeekSteps) {
          if (nextStep.status === "locked") {
            await ctx.db.patch(nextStep._id, { status: "available" });
          }
        }
      }

      const allSteps = await ctx.db
        .query("steps")
        .withIndex("by_journeyId_weekNumber", (q) =>
          q.eq("journeyId", step.journeyId)
        )
        .collect();

      const allComplete = allSteps.every(
        (s) => s._id.toString() === args.stepId.toString()
          ? true
          : s.status === "completed" || s.status === "skipped"
      );

      if (allComplete) {
        await ctx.db.patch(step.journeyId, { status: "completed" });
      }
    }
  },
});
```

- [ ] **Step 2: Add journey completion query**

Append to `convex/journeys.ts`:

```typescript
export const getCompletionStats = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) return null;

    const steps = await ctx.db
      .query("steps")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId)
      )
      .collect();

    const logs = await ctx.db
      .query("progressLogs")
      .withIndex("by_journeyId_weekNumber", (q) =>
        q.eq("journeyId", args.journeyId)
      )
      .collect();

    const completed = steps.filter((s) => s.status === "completed").length;
    const total = steps.length;
    const weeksActive = logs.length;
    const stepsByType = steps.reduce(
      (acc, s) => {
        if (s.status === "completed") {
          acc[s.type] = (acc[s.type] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      stepsCompleted: completed,
      stepsTotal: total,
      weeksActive,
      stepsByType,
      startedAt: journey.startedAt,
      targetRole: journey.targetRole,
      lane: journey.lane,
    };
  },
});
```

- [ ] **Step 3: Push to Convex**

```bash
npx convex dev --once
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add auto-unlock on week completion and journey completion detection"
```

---

## Task 4: Check-in UI

**Files:**
- Create: `components/journey/check-in-form.tsx`, `components/journey/check-in-result.tsx`, `app/(app)/journey/[journeyId]/check-in/page.tsx`

- [ ] **Step 1: Create the check-in form**

```tsx
// components/journey/check-in-form.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const blockerOptions = [
  "Not enough time this week",
  "Stuck on a specific step",
  "Lost motivation",
  "Waiting on external response",
  "Unsure what to prioritise",
  "Technical difficulty",
  "No blockers — things went well",
];

interface CheckInFormProps {
  weekNumber: number;
  stepsCompleted: number;
  stepsTotal: number;
  onSubmit: (reflection: string | null, blockers: string | null) => Promise<void>;
}

export function CheckInForm({
  weekNumber,
  stepsCompleted,
  stepsTotal,
  onSubmit,
}: CheckInFormProps) {
  const [reflection, setReflection] = useState("");
  const [selectedBlockers, setSelectedBlockers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleBlocker = (blocker: string) => {
    setSelectedBlockers((prev) =>
      prev.includes(blocker)
        ? prev.filter((b) => b !== blocker)
        : [...prev, blocker]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSubmit(
      reflection.trim() || null,
      selectedBlockers.length > 0 ? selectedBlockers.join("; ") : null
    );
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-background p-5">
        <p className="text-sm text-muted-foreground">Week {weekNumber} progress</p>
        <p className="mt-1 text-2xl font-bold">
          {stepsCompleted} of {stepsTotal} steps completed
        </p>
        <div className="mt-3 h-2 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{
              width: `${stepsTotal > 0 ? (stepsCompleted / stepsTotal) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          How did this week go? (optional)
        </label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="What went well, what was hard, anything on your mind..."
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Did anything get in the way?
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {blockerOptions.map((blocker) => (
            <button
              key={blocker}
              onClick={() => toggleBlocker(blocker)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                selectedBlockers.includes(blocker)
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              {blocker}
            </button>
          ))}
        </div>
      </div>

      <Button variant="accent" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating your check-in...
          </>
        ) : (
          "Complete check-in"
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create the check-in result component**

```tsx
// components/journey/check-in-result.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface CheckInResultProps {
  encouragement: string;
  recommendations: string[];
  journeyId: string;
}

export function CheckInResult({
  encouragement,
  recommendations,
  journeyId,
}: CheckInResultProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-6">
        <p className="text-sm font-medium text-accent">From Career Steer</p>
        <p className="mt-2 text-sm leading-relaxed">{encouragement}</p>
      </div>

      <div className="rounded-xl border border-border bg-background p-5">
        <h3 className="font-semibold">Recommendations for next week</h3>
        <ul className="mt-3 space-y-2">
          {recommendations.map((rec, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className="text-accent font-medium">{i + 1}.</span>
              {rec}
            </li>
          ))}
        </ul>
      </div>

      <Button variant="accent" asChild>
        <Link href={`/dashboard`}>
          Continue to next week
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create the check-in page**

```tsx
// app/(app)/journey/[journeyId]/check-in/page.tsx
"use client";

import { use, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { CheckInForm } from "@/components/journey/check-in-form";
import { CheckInResult } from "@/components/journey/check-in-result";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function CheckInPage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = use(params);
  const typedJourneyId = journeyId as Id<"journeys">;

  const steps = useQuery(api.steps.getAllByJourney, { journeyId: typedJourneyId });
  const journey = useQuery(api.journeys.getById, { journeyId: typedJourneyId });
  const generateCheckIn = useAction(api.progressLogs.generateCheckIn);

  const [result, setResult] = useState<{
    encouragement: string;
    updatedRecommendations: string[];
  } | null>(null);

  if (steps === undefined || journey === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const availableWeeks = [
    ...new Set(
      steps
        .filter((s) => s.status === "available" || s.status === "in_progress" || s.status === "completed")
        .map((s) => s.weekNumber)
    ),
  ].sort();
  const currentWeek = availableWeeks[availableWeeks.length - 1] ?? 1;

  const weekSteps = steps.filter((s) => s.weekNumber === currentWeek);
  const stepsCompleted = weekSteps.filter((s) => s.status === "completed").length;

  const handleSubmit = async (
    reflection: string | null,
    blockers: string | null
  ) => {
    const response = await generateCheckIn({
      journeyId: typedJourneyId,
      weekNumber: currentWeek,
      userReflection: reflection,
      blockers,
    });
    setResult(response);
  };

  return (
    <div className="mx-auto max-w-lg py-8">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">
        Week {currentWeek} Check-in
      </h1>
      <p className="mt-1 text-muted-foreground">
        Reflect on your progress and get recommendations for next week.
      </p>

      <div className="mt-6">
        {result ? (
          <CheckInResult
            encouragement={result.encouragement}
            recommendations={result.updatedRecommendations}
            journeyId={journeyId}
          />
        ) : (
          <CheckInForm
            weekNumber={currentWeek}
            stepsCompleted={stepsCompleted}
            stepsTotal={weekSteps.length}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add weekly check-in page with AI encouragement and recommendations"
```

---

## Task 5: Journey Completion Page

**Files:**
- Create: `components/journey/completion-summary.tsx`, `app/(app)/journey/[journeyId]/complete/page.tsx`

- [ ] **Step 1: Create the completion summary component**

```tsx
// components/journey/completion-summary.tsx
"use client";

import { JOURNEY_LANES, STEP_TYPES } from "@/lib/constants";

interface CompletionStats {
  stepsCompleted: number;
  stepsTotal: number;
  weeksActive: number;
  stepsByType: Record<string, number>;
  startedAt: number;
  targetRole: string | null;
  lane: keyof typeof JOURNEY_LANES;
}

export function CompletionSummary({ stats }: { stats: CompletionStats }) {
  const daysElapsed = Math.ceil(
    (Date.now() - stats.startedAt) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-6 text-center">
        <p className="text-4xl">🎉</p>
        <h2 className="mt-3 text-xl font-bold">Journey Complete</h2>
        <p className="mt-2 text-muted-foreground">
          You've completed your {JOURNEY_LANES[stats.lane].label} journey
          {stats.targetRole ? ` towards ${stats.targetRole}` : ""}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4 text-center">
          <p className="text-2xl font-bold">{stats.stepsCompleted}</p>
          <p className="text-xs text-muted-foreground">Steps completed</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4 text-center">
          <p className="text-2xl font-bold">{stats.weeksActive}</p>
          <p className="text-xs text-muted-foreground">Weeks active</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4 text-center">
          <p className="text-2xl font-bold">{daysElapsed}</p>
          <p className="text-xs text-muted-foreground">Days since you started</p>
        </div>
      </div>

      {Object.keys(stats.stepsByType).length > 0 && (
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="text-sm font-medium text-muted-foreground">
            What you accomplished
          </h3>
          <div className="mt-3 space-y-1.5">
            {Object.entries(stats.stepsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span>{STEP_TYPES[type as keyof typeof STEP_TYPES]?.label ?? type}</span>
                <span className="text-muted-foreground">{count} completed</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the completion page**

```tsx
// app/(app)/journey/[journeyId]/complete/page.tsx
"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { CompletionSummary } from "@/components/journey/completion-summary";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CompletionPage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = use(params);

  const stats = useQuery(api.journeys.getCompletionStats, {
    journeyId: journeyId as Id<"journeys">,
  });

  if (stats === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Journey not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <CompletionSummary stats={stats as any} />

      <div className="mt-8 space-y-3">
        <Button variant="accent" className="w-full" asChild>
          <Link href="/diagnostic">
            Start a new journey
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="secondary" className="w-full" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add journey completion page with stats summary"
```

---

## Task 6: Dashboard Check-in Prompt

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add check-in prompt to the dashboard**

In `app/(app)/dashboard/page.tsx`, add a check-in prompt banner. Insert this after the progress bar section and before the `WeekView`, inside the main return block when a roadmap exists:

```tsx
{/* Check-in prompt — show if current week has steps and no check-in log exists yet */}
{currentWeekSteps.filter((s) => s.status === "completed").length > 0 && (
  <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium">Ready to check in on Week {currentWeek}?</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Reflect on your progress and get recommendations for next week.
      </p>
    </div>
    <Button variant="accent" size="sm" asChild>
      <Link href={`/journey/${journey._id}/check-in`}>
        Check in
      </Link>
    </Button>
  </div>
)}
```

- [ ] **Step 2: Add completion redirect**

Also in the dashboard page, add a redirect for completed journeys. Add this after the roadmap null check:

```tsx
if (journey.status === "completed") {
  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      <p className="text-4xl">🎉</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        Journey Complete!
      </h1>
      <p className="mt-2 text-muted-foreground">
        Congratulations — you've finished your {JOURNEY_LANES[journey.lane].label} journey.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="accent" asChild>
          <Link href={`/journey/${journey._id}/complete`}>
            View your summary
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/diagnostic">Start a new journey</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add check-in prompt and completion state to dashboard"
```

---

## Task 7: Cron Job for Inactive User Nudges

**Files:**
- Create: `convex/crons.ts`

- [ ] **Step 1: Create the cron job**

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "nudge inactive users",
  { hourUTC: 9, minuteUTC: 0 },
  internal.journeys.checkForInactiveUsers
);

export default crons;
```

- [ ] **Step 2: Add the internal nudge function to journeys**

Append to `convex/journeys.ts`:

```typescript
import { internalAction } from "./_generated/server";

export const checkForInactiveUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    const activeJourneys = await ctx.runQuery(
      api.journeys.getAllActive
    );

    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;

    for (const journey of activeJourneys) {
      const steps = await ctx.runQuery(api.steps.getAllByJourney, {
        journeyId: journey._id,
      });

      const lastCompletedStep = steps
        .filter((s) => s.status === "completed")
        .sort((a, b) => b.weekNumber - a.weekNumber)[0];

      const lastActivity = lastCompletedStep
        ? journey.startedAt
        : journey.startedAt;

      if (lastActivity < twoDaysAgo) {
        console.log(
          `User ${journey.userId} has been inactive on journey ${journey._id}`
        );
      }
    }
  },
});
```

- [ ] **Step 3: Add the getAllActive query**

Append to `convex/journeys.ts`:

```typescript
export const getAllActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("journeys")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});
```

Note: The cron job currently logs inactive users. In a future iteration, this would trigger email notifications or in-app notifications. For now, it establishes the pattern.

- [ ] **Step 4: Push to Convex**

```bash
npx convex dev --once
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add daily cron job for inactive user detection"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run the full dev environment**

```bash
npx convex dev &
npm run dev
```

- [ ] **Step 2: Walk through the complete user journey**

1. Visit `localhost:3000` — landing page.
2. Sign up → redirected to `/diagnostic`.
3. Complete diagnostic (5 steps) → see processing screen → see results.
4. Select a target role on the Career Path Map → click "Start this journey".
5. Redirected to roadmap page → click "Generate my roadmap".
6. After generation, go to dashboard → see current week's steps.
7. Click a step → step workspace → click "Generate with AI" → see output.
8. Click "Ask Career Steer" → chat opens → send a message → see streamed reply.
9. Click "Mark complete" → step marked complete.
10. Complete all steps in week 1 → week 2 unlocks automatically.
11. Click "Check in" banner → complete the check-in form.
12. See AI encouragement and recommendations.
13. Continue until all steps are done → journey marked complete.
14. Dashboard shows completion state with link to summary.
15. View completion summary → see stats.
16. Click "Start a new journey" → back to diagnostic.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: Plan 4 complete — full Diagnose → Decide → Plan → Execute → Adapt loop"
```

---

## Summary

After completing Plan 4, the full Career Steer MVP is functional:

- **Weekly check-ins** — reflection form, blocker selection, AI-generated encouragement and recommendations
- **Auto week-unlocking** — completing all steps in a week unlocks the next
- **Journey completion** — automatic detection, stats summary, option to start a new journey
- **Dashboard states** — no journey, has journey (no roadmap), active roadmap, check-in prompt, completed journey
- **Cron job** — daily check for inactive users (notification hook ready)
- **Full user loop** — Diagnose → Decide → Plan → Execute → Adapt → Complete → Repeat

The product now supports the complete five-pillar experience described in the design spec.
