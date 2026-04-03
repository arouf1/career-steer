# Career Steer — Platform Design Spec

**Date:** 2026-04-03
**Status:** Draft
**Author:** AI-assisted design session

---

## 1. Vision & Positioning

Career Steer is an **AI-powered career decision-and-execution platform**. It helps people figure out their next best career move and gives them a structured plan to make it happen.

### Core promise

> "Figure out your next best career move — and get a step-by-step plan to make it real."

### What Career Steer is NOT

- A generic AI chatbot that answers career questions
- A job board or recruiter marketplace
- A loose bundle of career tools
- A motivational coaching app

### What Career Steer IS

- A **journey-led product** that diagnoses, decides, plans, and executes
- **Structured first, AI-assisted second** — the guided journey is the product; AI makes it personal
- **Outcome-oriented** — every feature exists to move the user closer to a concrete career result

### Strategic positioning

Career Steer competes as: **the platform that helps people make the right career move and follow through.**

The front door is a diagnostic ("What's your next best move?"), not a feature grid. Users are routed into guided journeys, not left to browse tools.

### Flagship wedge

**Career transitions** — the strongest pain point, clearest ROI, best AI-product fit. Career Switch is the deepest journey at launch. The other three journeys (Promotion Path, Job Search Sprint, Career Clarity) launch with full diagnostic → roadmap → execute flows, but with fewer specialised tools per step.

---

## 2. Product Pillars

The user experience follows a five-stage arc:

### Pillar 1: Diagnose

Help the user understand their current situation.

**Outputs:** career clarity score, likely friction points, top strengths, values/motivation profile, current-to-target feasibility.

**User feeling:** "This gets me."

### Pillar 2: Decide

Help the user choose the right next move.

**Outputs:** lane recommendation (career switch / promotion / job search / career clarity), target role suggestions, feasibility score, visual career path map.

**User feeling:** "I know what I should do next."

### Pillar 3: Plan

Turn the decision into a roadmap.

**Outputs:** 6-8 week plan, weekly milestones, specific tasks, skill gap breakdown, timeline assumptions.

**User feeling:** "This feels manageable."

### Pillar 4: Execute

Give tools that help them act — tied to roadmap steps, not offered in isolation.

**Outputs/features:** CV rewrite, LinkedIn rewrite, role-specific interview prep, networking message drafts, application tracking, promotion evidence tracking.

**User feeling:** "I'm making progress."

### Pillar 5: Adapt

Weekly check-ins, updated recommendations, and accountability.

**Outputs:** progress summary, encouragement, adjusted next actions, blocker resolution.

**User feeling:** "I'm not doing this alone."

---

## 3. Guided Journeys

Users are routed into one of four journeys based on their diagnostic results.

### A. Career Switch (flagship — deepest at launch)

For users moving from one role family to another.

**Step types:** target role matcher, transferable skills translator, gap analysis, upskilling recommendations, project/portfolio suggestions, transition CV builder, LinkedIn rewrite, role-specific interview prep, application tracker, progress tracker.

### B. Promotion Path

For users who feel stuck in their current role.

**Step types:** promotion readiness assessment, impact/evidence capture tool, growth gap map, manager conversation prep, visibility plan, promotion case builder.

### C. Job Search Sprint

For users who know what they want and need execution help.

**Step types:** CV targeting, job matching, tailored applications, outreach drafting, interview prep, application funnel dashboard.

### D. Career Clarity

For users who feel stuck but aren't sure why.

**Step types:** values assessment, strengths analysis, burnout vs misalignment diagnosis, role-fit mapping, guided decision framework.

---

## 4. Tech Stack

| Layer | Choice | Role |
|---|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) | Pages, layouts, server components |
| Database + Backend | Convex | Real-time document DB, server functions, cron jobs |
| Auth | Clerk | Sign-up/sign-in, user management, Convex integration |
| AI orchestration | Vercel AI SDK v6 (`ai`, `@openrouter/ai-sdk-provider`) | Structured generation, streaming, chat hooks |
| AI models | Google Gemini via OpenRouter | Content generation |
| Styling | Tailwind CSS + Radix UI primitives | Minimal/calm design system |
| Visualisation | React Flow | Career path map (diagnostic results) |
| Deployment | Vercel | Hosting, edge functions, preview deployments |

---

## 5. Architecture Overview

```
User (browser)
  │
  ├── Next.js App (Vercel)
  │     ├── Pages / Layouts (App Router)
  │     ├── Client Components (Convex React hooks for real-time data)
  │     └── Route Handlers (streaming AI chat only)
  │
  ├── Clerk (auth)
  │     └── Webhook → Convex (sync user on sign-up)
  │
  ├── Convex (backend + DB)
  │     ├── Queries (read journeys, roadmaps, steps, progress)
  │     ├── Mutations (create/update journeys, steps, progress logs)
  │     ├── Actions (AI generation via AI SDK + OpenRouter → write results)
  │     └── Cron jobs (weekly check-in reminders)
  │
  └── OpenRouter → Gemini
        ├── Structured outputs (JSON): diagnoses, roadmaps, gap analyses
        └── Conversational: step-scoped AI assistant
```

### Key architectural decisions

1. **Hybrid AI layer.** Structured generation (diagnostics, roadmaps, CV rewrites) lives in **Convex actions** — single backend, clean data flow, works with cron jobs. Streaming chat (step-scoped assistant) lives in a **Next.js Route Handler** using `useChat` + `streamText`. One clean boundary, not two messy ones.

2. **Real-time by default.** Convex reactive queries mean the UI updates automatically when a roadmap is generated, a step is completed, or a check-in is logged. No manual refetching.

3. **No separate API layer.** Convex replaces a traditional REST/GraphQL API. Next.js pages call Convex directly via hooks (`useQuery`, `useMutation`).

4. **Step templates in code, not DB.** Each step type has a template defining its system prompt, input schema, and output schema. Version-controlled, not user-editable. The DB stores generated outputs, not templates.

---

## 6. Data Model (Convex)

### `users`

Synced from Clerk via webhook on sign-up.

```typescript
users: {
  clerkId: string,
  email: string,
  name: string,
  createdAt: number,
  profile: {
    currentRole: string,
    experienceLevel: "early" | "mid" | "senior",
    industry: string,
    salaryBand: string,
    location: string,
    education: string,
  } | null,
}
```

### `diagnostics`

Intake questionnaire results + AI analysis. One active per user (retakeable).

```typescript
diagnostics: {
  userId: Id<"users">,
  completedAt: number,
  answers: {
    goalState: "new_job" | "promotion" | "new_direction" | "career_switch" | "not_sure",
    frictions: string[],
    constraints: {
      hoursPerWeek: number,
      salaryFloor: number,
      urgency: "low" | "medium" | "high",
      willingnessToRetrain: boolean,
    },
    confidence: "low" | "medium" | "high",
  },
  analysis: {
    recommendedLane: "career_switch" | "promotion" | "job_search" | "career_clarity",
    topStrengths: string[],
    keyBlockers: string[],
    suggestedRoles: string[],
    feasibilityScore: number,
    summary: string,
  } | null,
}
```

### `journeys`

One active journey per user.

```typescript
journeys: {
  userId: Id<"users">,
  diagnosticId: Id<"diagnostics">,
  lane: "career_switch" | "promotion" | "job_search" | "career_clarity",
  status: "active" | "paused" | "completed",
  startedAt: number,
  targetRole: string | null,
  targetTimeline: string | null,
}
```

### `roadmaps`

AI-generated plan. Belongs to a journey. Versioned.

```typescript
roadmaps: {
  journeyId: Id<"journeys">,
  generatedAt: number,
  version: number,
  overview: string,
  durationWeeks: number,
  milestones: [{
    weekNumber: number,
    title: string,
    description: string,
  }],
}
```

### `steps`

Individual tasks within a roadmap. Atomic unit of execution.

```typescript
steps: {
  roadmapId: Id<"roadmaps">,
  journeyId: Id<"journeys">,
  weekNumber: number,
  order: number,
  type: "cv_rewrite" | "linkedin_rewrite" | "interview_prep" | "gap_analysis"
       | "skill_plan" | "networking" | "application" | "reflection"
       | "evidence_capture" | "manager_prep" | "values_assessment" | "custom",
  title: string,
  description: string,
  status: "locked" | "available" | "in_progress" | "completed" | "skipped",
  generationStatus: "idle" | "generating" | "completed" | "failed",
  output: any | null,
}
```

### `conversations`

Step-scoped AI assistant threads.

```typescript
conversations: {
  stepId: Id<"steps">,
  userId: Id<"users">,
  messages: [{
    role: "user" | "assistant",
    content: string,
    createdAt: number,
  }],
}
```

### `progressLogs`

Weekly check-ins.

```typescript
progressLogs: {
  journeyId: Id<"journeys">,
  weekNumber: number,
  completedAt: number,
  stepsCompleted: number,
  stepsTotal: number,
  userReflection: string | null,
  blockers: string | null,
  encouragement: string,
  updatedRecommendations: string[],
}
```

### `rateLimits`

Per-user AI usage tracking.

```typescript
rateLimits: {
  userId: Id<"users">,
  date: string,
  generationCount: number,
  chatMessageCount: number,
}
```

### Key indexes

- `users` by `clerkId`
- `diagnostics` by `userId`
- `journeys` by `userId` + `status`
- `steps` by `journeyId` + `weekNumber`
- `steps` by `roadmapId`
- `conversations` by `stepId`
- `progressLogs` by `journeyId` + `weekNumber`
- `rateLimits` by `userId` + `date`

---

## 7. UX Flows

### Flow 1: First visit → Diagnosis → Path selection

```
Landing Page
  │  Hero: "Figure out your next best career move"
  │  CTA: "Get my career roadmap" → Sign up (Clerk)
  ▼
Diagnostic Questionnaire (5 steps, ~3-4 min)
  │  Step 1: Current state (role, experience, industry, salary, location)
  │  Step 2: Goal state (new job / promotion / new direction / career switch / not sure)
  │  Step 3: Frictions (not getting interviews, unclear path, low confidence, burnout...)
  │  Step 4: Constraints (hours/week, salary floor, urgency, willingness to retrain)
  │  Step 5: Confidence & readiness
  ▼
Processing Screen (AI generating analysis — calm animation, ~5-10s)
  ▼
Diagnostic Results
  │  Summary card: "Your best next move: Career Switch"
  │  Key strengths + key blockers (chips/tags)
  │  Feasibility score
  │  ★ Career Path Map (React Flow) ★
  │    Current role → bridge skills → target roles (interactive)
  │    User clicks a target role to select it
  │    "Start this journey" CTA
  ▼
Journey Created → Roadmap Generation
```

**UX notes:**
- Questionnaire feels conversational — one question group per screen, progress bar, smooth transitions.
- Processing screen sets expectations: "Analysing your skills, matching roles, building your options..."
- Diagnostic results page is the emotional peak — must feel decisive and personalised.
- Career Path Map (React Flow) shows current role → bridge skills → target roles as interactive nodes. Read-only visualisation, not a builder. Custom nodes styled to match the calm aesthetic.

### Flow 2: Roadmap → Weekly execution

```
Dashboard (journey home)
  │  Journey header: lane, target role, timeline, overall progress
  │  Roadmap overview: milestone timeline (weeks)
  │  Current week: expanded with active steps
  ▼
Step Card (e.g. "Rewrite your CV for Project Coordinator")
  │  Description, status, "Start" button
  ▼
Step Workspace
  │  Main area: step-specific UI (CV editor, question cards, skills table, etc.)
  │  AI Assistant panel (slide-out sidebar, scoped to this step)
  │  "Mark complete" → updates step status
  ▼
Back to Dashboard (next step available)
```

**UX notes:**
- Dashboard defaults to weekly view — "This week" prominent, past/future weeks collapsed.
- Steps unlock progressively but not rigidly — users can skip or reorder within a week.
- AI assistant is available within steps only, not on the dashboard. Always contextual.

### Flow 3: Weekly check-in

```
Triggered: end of each week (notification or dashboard prompt)
  ▼
Check-in Screen
  │  "This week: 4 of 6 steps completed"
  │  Quick reflection (optional free text)
  │  Blocker selection (multiple choice)
  ▼
AI generates: encouragement, updated recommendations, adjusted tasks
  ▼
Next week view opens
```

### Flow 4: Journey completion or pivot

```
All milestones complete (or user decides to pivot)
  ▼
Completion Screen
  │  Summary: accomplishments, skills gained, applications sent
  │  Option A: "Start a new journey" → back to diagnostic
  │  Option B: "Continue refining" → keep access to tools
  │  Option C: "I landed the role!" → celebration + optional testimonial
```

---

## 8. Page Structure (App Router)

```
app/
  (marketing)/
    page.tsx                         — Landing/hero
    about/page.tsx
    pricing/page.tsx                 — Placeholder for later

  (auth)/
    sign-in/[[...sign-in]]/page.tsx  — Clerk
    sign-up/[[...sign-up]]/page.tsx  — Clerk

  (app)/                             — Authenticated area
    layout.tsx                       — App shell (sidebar nav, user menu)
    diagnostic/
      page.tsx                       — Questionnaire
      results/page.tsx               — Results + Career Path Map
    dashboard/
      page.tsx                       — Journey home, weekly view
    journey/
      [journeyId]/
        roadmap/page.tsx             — Full roadmap view
        step/[stepId]/page.tsx       — Step workspace + AI assistant
        check-in/page.tsx            — Weekly check-in
        complete/page.tsx            — Journey completion
    settings/
      page.tsx                       — Profile, preferences

  api/
    ai/
      chat/route.ts                  — Streaming assistant (AI SDK)
    webhooks/
      clerk/route.ts                 — Clerk → Convex user sync
```

---

## 9. AI Integration — Prompt Architecture

### Three AI modes

| Mode | AI SDK function | Where | When used | Model |
|---|---|---|---|---|
| Structured generation | `generateObject` | Convex actions | Diagnostics, roadmaps, step outputs | Gemini 2.5 Pro |
| Text generation | `generateText` | Convex actions | Encouragement, summaries | Gemini 2.5 Flash |
| Conversational | `streamText` via `useChat` | Next.js Route Handler | Step-scoped assistant | Gemini 2.5 Flash |

### Prompt layers

Every prompt is built from composable layers:

1. **Base persona** — shared across all prompts. Defines tone (calm, direct, practical), language (British English), and constraints (never fabricate experience, be honest about uncertainty).
2. **User context** — injected from DB: profile, diagnostic results, journey details, prior outputs. Includes the user's name for personalisation (used occasionally, not every sentence).
3. **Task-specific instructions** — from the step template. What to generate, quality criteria, output constraints.
4. **Output schema** — Zod schema enforced via `generateObject`.

### Base persona

```
You are Career Steer, an AI career adviser.

Tone: calm, direct, practical. Never patronising. Never vague.
You speak in British English.

The user's name is {name}. Address them by name occasionally —
not every message, but enough to feel personal.

Rules:
- Always ground advice in the user's actual experience and constraints
- Never invent qualifications or experience the user hasn't mentioned
- When uncertain, say so and explain the trade-offs
- Prefer concrete actions over abstract guidance
- Reference specific roles, skills, and industries — not generalities
- Keep outputs concise. Respect the user's time.
```

### Step templates

Each step type is a code-level configuration:

```typescript
type StepTemplate = {
  type: string;
  title: (ctx: UserContext) => string;
  description: (ctx: UserContext) => string;
  systemPrompt: (ctx: UserContext) => string;
  outputSchema: z.ZodSchema;
  chatSystemPrompt: (ctx: UserContext) => string;
};
```

Templates are version-controlled, not stored in the DB. The DB stores generated outputs only.

### Key step output schemas

**CV Rewrite:** summary, sections (heading + items with title/org/period/bullets), keywords, application notes.

**Gap Analysis:** target role requirements (skill, importance, user level, evidence, recommendation), overall readiness score, quick wins, longer-term gaps, suggested resources.

**Interview Prep:** questions (question, category, why they ask, model answer, tips), general advice, common mistakes.

**Roadmap:** overview, duration in weeks, milestones (week number, title, description, steps with type/title/description/estimated minutes).

### Model selection

- **Gemini 2.5 Pro** — high-stakes structured generation (diagnostics, roadmaps, CV rewrites). Quality over speed.
- **Gemini 2.5 Flash** — conversational assistant, encouragement, lighter tasks. Speed and cost over maximum quality.

---

## 10. Design & Visual Direction

### Aesthetic: minimal and calm

- Lots of whitespace, muted colour palette, generous spacing
- Clean type hierarchy — content-focused, not chrome-heavy
- Soft accents for progress/status indicators
- AI assistant feels like a quiet conversation, not a flashy widget
- Almost therapeutic feel — signals "we've got this, you can breathe"

### Reference feel: Notion, Linear, Calm

### React Flow (Career Path Map)

- Custom nodes: current role, bridge skills, target roles
- Styled to match the calm aesthetic — rounded, soft shadows, muted colours
- Fit scores and skill gap indicators rendered on nodes
- Read-only: click-to-select, no drag-to-connect
- The centrepiece of the diagnostic results page

---

## 11. Error Handling & Edge Cases

### AI generation failures

- **Timeout/5xx:** Automatic retry (up to 2, exponential backoff) in the Convex action. User sees "Still working..." then "Try again" if all fail.
- **Schema validation failure:** Retry once with stricter prompt. If still fails → log raw output, show "Couldn't generate — try again."
- **Inappropriate content:** Post-generation scan for red flags. Block and log rather than display.
- **Rate limit hit:** Clear message with reset time. Tracked in `rateLimits` table.

### Generation state machine

```
idle → generating → completed
                  → failed → retry → completed
                                    → failed (error UI)
```

Stored on each step/roadmap document. UI binds reactively — no polling.

### Diagnostic edge cases

- **Contradictory answers:** AI names the tension honestly, suggests best-fit lane, acknowledges the contradiction.
- **Too vague (all "not sure"):** Routes to Career Clarity lane. This is valid, not an error.
- **Unrealistic target:** Feasibility score reflects this. AI suggests realistic intermediate steps.
- **Retakes diagnostic:** Previous diagnostic soft-deleted. Active journey paused. New journey from new results.

### Journey edge cases

- **Skips most steps:** Check-in acknowledges without guilt. Offers to adjust pace.
- **Completes early:** Offers additional depth steps.
- **Abandons for weeks:** Soft re-engagement prompt after 2 weeks. Check-in re-orients on return.
- **Changes target role mid-journey:** Partial re-diagnosis. Roadmap regenerated from current week. Completed steps preserved.

### Auth edge cases

- **Webhook failure:** Fallback user creation on first authenticated page load from Clerk session data.
- **Account deletion:** Clerk webhook → Convex soft-deletes user and anonymises data.

### Network resilience

- **Convex disconnection:** Stale data shown with "Reconnecting..." indicator. Mutations queue and retry.
- **Browser closed during generation:** Convex action continues server-side. Result available on return.
- **Slow AI response:** Progressive messaging at 5s ("Taking a moment...") and 15s ("Still working — complex analyses take longer").

### Data integrity

- Optimistic updates only for low-risk actions.
- Idempotent generation mutations (detect in-progress, return early on duplicate triggers).
- Versioned roadmaps — regeneration keeps the previous version.

---

## 12. Pricing Strategy

### Launch: fully free

No paywall at launch. Auth required (for persistence). Goal: gather users, validate journeys, understand usage patterns.

### Future: freemium or programme-based

- **Option A (freemium):** Free diagnostic for everyone, paywall at roadmap/execution.
- **Option B (programme-based):** Fixed-price plans per journey type (Career Switch Plan, Promotion Plan, etc.).
- **Option C (hybrid):** Low monthly subscription + premium upgrade for deeper roadmaps, coaching, or accountability.

Billing layer will be stubbed (not built) at launch. Architecture supports gating without rework.

---

## 13. What to Avoid

- A generic AI chat interface as the main product surface
- A loose bundle of disconnected tools
- A broad "career marketplace"
- A vague personal growth platform
- Trying to support too many transition paths before the core flow is strong
- Fake optimism — the AI must be honest about feasibility and trade-offs

The product should feel: **structured, decisive, practical, outcome-oriented.**

---

## 14. Success Criteria (MVP)

The MVP is successful if:

1. A user can complete the diagnostic in under 5 minutes and feel understood
2. The career path map feels personalised, not generic
3. The roadmap gives concrete weekly actions, not abstract advice
4. At least one step type (CV rewrite) produces output good enough that a user would actually use it
5. The weekly check-in creates a reason to come back
6. The whole experience feels calm, trustworthy, and human — not robotic or salesy
