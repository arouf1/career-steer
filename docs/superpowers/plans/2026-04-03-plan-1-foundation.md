# Career Steer — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Career Steer project with Next.js 16.2, Convex, Clerk auth, Tailwind + Radix UI, a marketing landing page, and the authenticated app shell — ready for feature development.

**Architecture:** Next.js 16.2 App Router with route groups for marketing `(marketing)`, auth `(auth)`, and the authenticated app `(app)`. Convex handles the database and backend functions. Clerk handles authentication with a webhook syncing users to Convex. Tailwind CSS + Radix UI provide the design system with a calm, minimal aesthetic.

**Tech Stack:** Next.js 16.2, React 19, Convex, Clerk, Tailwind CSS 4, Radix UI, Lucide React (icons), TypeScript

---

## File Structure

```
career-steer/
├── app/
│   ├── layout.tsx                          — Root layout (fonts, metadata, providers)
│   ├── globals.css                         — Tailwind base + custom CSS variables
│   ├── (marketing)/
│   │   ├── layout.tsx                      — Marketing layout (navbar + footer)
│   │   └── page.tsx                        — Landing page / hero
│   ├── (auth)/
│   │   ├── layout.tsx                      — Centred auth layout
│   │   ├── sign-in/[[...sign-in]]/page.tsx — Clerk sign-in
│   │   └── sign-up/[[...sign-up]]/page.tsx — Clerk sign-up
│   └── (app)/
│       ├── layout.tsx                      — App shell (sidebar + header)
│       └── dashboard/
│           └── page.tsx                    — Dashboard placeholder
├── components/
│   ├── ui/
│   │   └── button.tsx                      — Shared button component (Radix + Tailwind)
│   ├── marketing/
│   │   ├── navbar.tsx                      — Marketing navbar
│   │   └── footer.tsx                      — Marketing footer
│   └── app/
│       ├── sidebar.tsx                     — App sidebar navigation
│       └── header.tsx                      — App header with user menu
├── convex/
│   ├── schema.ts                           — Full Convex schema (all tables)
│   ├── users.ts                            — User queries and mutations
│   └── http.ts                             — Clerk webhook handler
├── lib/
│   ├── utils.ts                            — Utility functions (cn helper)
│   └── constants.ts                        — App-wide constants
├── convex.config.ts                        — Convex project config (generated)
├── next.config.ts                          — Next.js config
├── tailwind.config.ts                      — Tailwind config with custom theme
├── tsconfig.json                           — TypeScript config
├── package.json                            — Dependencies
├── .env.local                              — Environment variables (Clerk + Convex + OpenRouter keys)
└── middleware.ts                            — Clerk auth middleware
```

---

## Task 1: Scaffold Next.js 16.2 Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Create the Next.js project**

Run from the parent directory of `career-steer` (the project directory already exists but is empty apart from docs):

```bash
cd /Users/aqilrouf/Documents/Projects
npx create-next-app@latest career-steer --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

When prompted, accept defaults. If the directory is non-empty, it will ask to proceed — say yes. This scaffolds Next.js 16.2 with Tailwind CSS 4, TypeScript, ESLint, and App Router.

- [ ] **Step 2: Verify the scaffold works**

```bash
cd /Users/aqilrouf/Documents/Projects/career-steer
npm run dev
```

Expected: Dev server starts on `localhost:3000`. You see the default Next.js page. Stop the server with `Ctrl+C`.

- [ ] **Step 3: Clean up the default scaffold**

Replace `app/page.tsx` with a minimal placeholder:

```tsx
// app/page.tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-centre justify-centre">
      <h1 className="text-4xl font-bold">Career Steer</h1>
    </main>
  );
}
```

Remove any default images from `public/` that came with the scaffold (keep `public/` itself).

- [ ] **Step 4: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 16.2 project with Tailwind and TypeScript"
```

---

## Task 2: Configure Tailwind Theme & Design Tokens

**Files:**
- Modify: `app/globals.css`
- Create: `lib/utils.ts`

- [ ] **Step 1: Install the `clsx` and `tailwind-merge` utilities**

```bash
npm install clsx tailwind-merge
```

- [ ] **Step 2: Create the `cn` utility**

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Set up CSS custom properties for the calm theme**

Replace the contents of `app/globals.css` with:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-background: #FAFAF9;
  --color-foreground: #1C1917;
  --color-muted: #F5F5F4;
  --color-muted-foreground: #78716C;
  --color-border: #E7E5E4;
  --color-ring: #A8A29E;
  --color-primary: #292524;
  --color-primary-foreground: #FAFAF9;
  --color-secondary: #F5F5F4;
  --color-secondary-foreground: #1C1917;
  --color-accent: #4F46E5;
  --color-accent-foreground: #FFFFFF;
  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-danger: #DC2626;

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 4: Verify the theme loads**

```bash
npm run dev
```

Expected: Page loads with the warm stone background (`#FAFAF9`) and dark text. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: configure calm design tokens and cn utility"
```

---

## Task 3: Install Core Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Convex**

```bash
npm install convex
```

- [ ] **Step 2: Install Clerk**

```bash
npm install @clerk/nextjs
```

- [ ] **Step 3: Install Radix UI primitives and Lucide icons**

```bash
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-avatar @radix-ui/react-progress @radix-ui/react-tabs @radix-ui/react-tooltip lucide-react
```

- [ ] **Step 4: Install AI SDK and OpenRouter provider**

```bash
npm install ai @openrouter/ai-sdk-provider zod
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: install Convex, Clerk, Radix UI, AI SDK, and OpenRouter dependencies"
```

---

## Task 4: Set Up Convex

**Files:**
- Create: `convex/schema.ts`, `convex/_generated/` (auto-generated)
- Modify: `app/layout.tsx`

- [ ] **Step 1: Initialise Convex**

```bash
npx convex dev --once
```

This will prompt you to create a new Convex project. Follow the prompts — name it `career-steer`. This creates the `convex/` directory and generates `convex/_generated/`.

- [ ] **Step 2: Create the `.env.local` file with the Convex URL**

After `npx convex dev --once`, Convex writes a `.env.local` file with `CONVEX_DEPLOYMENT` and a `NEXT_PUBLIC_CONVEX_URL`. Verify they exist:

```bash
cat .env.local
```

Expected: Contains `CONVEX_DEPLOYMENT=...` and `NEXT_PUBLIC_CONVEX_URL=https://....convex.cloud`.

- [ ] **Step 3: Write the full Convex schema**

```typescript
// convex/schema.ts
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
```

- [ ] **Step 4: Push the schema to Convex**

```bash
npx convex dev --once
```

Expected: Schema is pushed successfully. No errors.

- [ ] **Step 5: Create the Convex provider wrapper**

```tsx
// components/convex-provider.tsx
"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ReactNode } from "react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

- [ ] **Step 6: Wrap the root layout with providers**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/convex-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Career Steer — Figure out your next best career move",
  description:
    "AI-powered career decision and execution platform. Get a personalised roadmap to switch careers, get promoted, or land your next role faster.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Verify Convex + Clerk providers load without errors**

```bash
npm run dev
```

Expected: Page loads without errors. The Convex and Clerk providers initialise (you may see Clerk warnings about missing keys — that's expected, we'll add them next). Stop the server.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: set up Convex with full schema and provider wrapper"
```

---

## Task 5: Set Up Clerk Authentication

**Files:**
- Create: `middleware.ts`, `app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `app/(auth)/sign-up/[[...sign-up]]/page.tsx`, `app/(auth)/layout.tsx`
- Modify: `.env.local`

- [ ] **Step 1: Add Clerk environment variables**

Go to [clerk.com](https://clerk.com), create an application called "Career Steer". Copy the publishable key and secret key. Add them to `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/diagnostic
```

Note: new users go to `/diagnostic` after sign-up; returning users go to `/dashboard` after sign-in.

- [ ] **Step 2: Create Clerk middleware**

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/about(.*)",
  "/pricing(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 3: Create the auth layout**

```tsx
// app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Create the sign-in page**

```tsx
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <SignIn />;
}
```

- [ ] **Step 5: Create the sign-up page**

```tsx
// app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return <SignUp />;
}
```

- [ ] **Step 6: Verify auth flow works**

```bash
npm run dev
```

1. Visit `localhost:3000/sign-up` — Clerk sign-up form appears.
2. Visit `localhost:3000/sign-in` — Clerk sign-in form appears.
3. Visit `localhost:3000/dashboard` — redirects to sign-in (protected route).

Stop the server.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: set up Clerk auth with middleware, sign-in, and sign-up pages"
```

---

## Task 6: Clerk → Convex User Sync (Webhook)

**Files:**
- Create: `convex/http.ts`, `convex/users.ts`
- Modify: `.env.local`

- [ ] **Step 1: Add the Clerk webhook secret to env**

In the Clerk dashboard, go to Webhooks → Add Endpoint. Set the URL to your deployment URL + `/api/webhooks/clerk` (for local dev, use a tool like ngrok or the Convex built-in HTTP action approach). Copy the signing secret.

For the Convex HTTP action approach (recommended), the webhook URL will be your Convex deployment URL + the HTTP route. Add the signing secret:

```
CLERK_WEBHOOK_SECRET=whsec_...
```

Also install the `svix` package for webhook verification:

```bash
npm install svix
```

- [ ] **Step 2: Create user mutation functions**

```typescript
// convex/users.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      createdAt: Date.now(),
      profile: null,
    });
  },
});

export const updateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) return;

    const updates: Record<string, string> = {};
    if (args.email !== undefined) updates.email = args.email;
    if (args.name !== undefined) updates.name = args.name;

    await ctx.db.patch(user._id, updates);
  },
});

export const deleteUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .unique();
  },
});
```

- [ ] **Step 3: Create the Clerk webhook HTTP handler**

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Missing webhook secret", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();
    const wh = new Webhook(webhookSecret);

    let event: {
      type: string;
      data: {
        id: string;
        email_addresses: { email_address: string }[];
        first_name: string | null;
        last_name: string | null;
      };
    };

    try {
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as typeof event;
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }

    const { type, data } = event;

    switch (type) {
      case "user.created":
        await ctx.runMutation(api.users.createUser, {
          clerkId: data.id,
          email: data.email_addresses[0]?.email_address ?? "",
          name: [data.first_name, data.last_name].filter(Boolean).join(" ") || "User",
        });
        break;

      case "user.updated":
        await ctx.runMutation(api.users.updateUser, {
          clerkId: data.id,
          email: data.email_addresses[0]?.email_address,
          name: [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined,
        });
        break;

      case "user.deleted":
        await ctx.runMutation(api.users.deleteUser, {
          clerkId: data.id,
        });
        break;
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
```

- [ ] **Step 4: Push to Convex and verify**

```bash
npx convex dev --once
```

Expected: Schema and functions deploy successfully. The HTTP endpoint is available at your Convex deployment URL + `/clerk-webhook`.

- [ ] **Step 5: Configure the webhook in Clerk dashboard**

In Clerk Dashboard → Webhooks → Add Endpoint:
- URL: `https://<your-convex-deployment>.convex.site/clerk-webhook`
- Events: `user.created`, `user.updated`, `user.deleted`

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add Clerk webhook handler for user sync to Convex"
```

---

## Task 7: Shared Button Component

**Files:**
- Create: `components/ui/button.tsx`

- [ ] **Step 1: Create the button component**

```tsx
// components/ui/button.tsx
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "accent";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
  ghost:
    "hover:bg-muted text-foreground",
  accent:
    "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm rounded-md",
  md: "h-10 px-5 text-sm rounded-lg",
  lg: "h-12 px-8 text-base rounded-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, type ButtonProps };
```

- [ ] **Step 2: Verify it renders**

Temporarily use the button in `app/page.tsx`:

```tsx
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="accent">Get Started</Button>
    </main>
  );
}
```

```bash
npm run dev
```

Expected: Three buttons render with correct styles. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add shared Button component with Radix Slot and variants"
```

---

## Task 8: Marketing Layout (Navbar + Footer)

**Files:**
- Create: `components/marketing/navbar.tsx`, `components/marketing/footer.tsx`, `app/(marketing)/layout.tsx`

- [ ] **Step 1: Create the marketing navbar**

```tsx
// components/marketing/navbar.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Career Steer
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/about"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button variant="accent" size="sm" asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Create the marketing footer**

```tsx
// components/marketing/footer.tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Career Steer. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Create the marketing layout**

```tsx
// app/(marketing)/layout.tsx
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Verify the layout renders**

```bash
npm run dev
```

Expected: Landing page shows the navbar at top, content in middle, footer at bottom. Navbar has "Career Steer" logo, About, Pricing, Sign in, and Get started links.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add marketing layout with navbar and footer"
```

---

## Task 9: Landing Page

**Files:**
- Modify: `app/(marketing)/page.tsx`

- [ ] **Step 1: Build the landing page**

```tsx
// app/(marketing)/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Compass, Map, Rocket, RefreshCw } from "lucide-react";

const journeys = [
  {
    icon: Compass,
    title: "Switch Careers",
    description:
      "Get a realistic plan to move from your current role into the one you actually want.",
  },
  {
    icon: Rocket,
    title: "Get Promoted",
    description:
      "Turn your work into a stronger case for growth, visibility, and better pay.",
  },
  {
    icon: Map,
    title: "Land a Job Faster",
    description:
      "Know what roles fit, how to position yourself, and what to do each week.",
  },
  {
    icon: RefreshCw,
    title: "Find Clarity",
    description:
      "Understand whether you need a new role, a new team, or a new direction entirely.",
  },
];

const steps = [
  {
    number: "01",
    title: "Tell us where you are",
    description:
      "Answer a few questions about your role, goals, and what's blocking you.",
  },
  {
    number: "02",
    title: "See your best next move",
    description:
      "Get a personalised analysis with realistic target roles and a clear recommendation.",
  },
  {
    number: "03",
    title: "Follow your roadmap",
    description:
      "A week-by-week plan with actionable steps: CV rewrites, interview prep, skills to build.",
  },
  {
    number: "04",
    title: "Make it happen",
    description:
      "AI tools tied to each step of your plan, plus weekly check-ins to keep you on track.",
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Figure out your next
          <br />
          best career move
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Career Steer helps you decide what to do next — and gives you a
          step-by-step plan to make it happen, with AI support every step of the
          way.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button variant="accent" size="lg" asChild>
            <Link href="/sign-up">
              Get my career roadmap
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Journeys */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-centre text-2xl font-semibold tracking-tight sm:text-3xl">
            Whatever&apos;s next, we&apos;ll help you get there
          </h2>
          <p className="mt-3 text-muted-foreground">
            Choose the journey that fits where you are right now.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {journeys.map((journey) => (
              <div
                key={journey.title}
                className="rounded-xl border border-border bg-background p-6 transition-shadow hover:shadow-sm"
              >
                <journey.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-4 font-semibold">{journey.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {journey.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.number}>
                <span className="text-sm font-medium text-accent">
                  {step.number}
                </span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to move forward?
          </h2>
          <p className="mt-4 text-muted-foreground">
            It takes about 3 minutes to get your personalised career analysis
            and roadmap.
          </p>
          <div className="mt-8">
            <Button variant="accent" size="lg" asChild>
              <Link href="/sign-up">
                Get started — it&apos;s free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify the landing page**

```bash
npm run dev
```

Expected: Full landing page renders with hero, four journey cards, "How it works" section, and bottom CTA. All links point to `/sign-up`. The design is clean, spacious, and uses the calm colour palette.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add landing page with hero, journeys, how-it-works, and CTA"
```

---

## Task 10: Authenticated App Shell

**Files:**
- Create: `components/app/sidebar.tsx`, `components/app/header.tsx`, `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create the app sidebar**

```tsx
// components/app/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Compass, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/diagnostic", label: "Diagnostic", icon: Compass },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-muted/30">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          Career Steer
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Create the app header**

```tsx
// components/app/header.tsx
"use client";

import { UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-end border-b border-border px-6">
      <UserButton afterSignOutUrl="/" />
    </header>
  );
}
```

- [ ] **Step 3: Create the app layout**

```tsx
// app/(app)/layout.tsx
import { Sidebar } from "@/components/app/sidebar";
import { Header } from "@/components/app/header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the dashboard placeholder**

```tsx
// app/(app)/dashboard/page.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

export default function DashboardPage() {
  const user = useQuery(api.users.getCurrentUser);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">
        {user ? `Welcome back, ${user.name}` : "Welcome to Career Steer"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your career journey starts here. Complete the diagnostic to get your
        personalised roadmap.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Verify the authenticated app shell**

```bash
npm run dev
```

1. Sign up at `/sign-up` (create a test account).
2. After sign-up, you should be redirected to `/diagnostic` (which will 404 — that's expected, we haven't built it yet).
3. Navigate to `/dashboard` manually — you should see the app shell: sidebar on left, header with Clerk user button on right, and the dashboard placeholder with your name.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add authenticated app shell with sidebar, header, and dashboard placeholder"
```

---

## Task 11: App Constants and Shared Types

**Files:**
- Create: `lib/constants.ts`

- [ ] **Step 1: Create shared constants**

```typescript
// lib/constants.ts
export const JOURNEY_LANES = {
  career_switch: {
    label: "Career Switch",
    description: "Move from your current role into a new one",
    colour: "#4F46E5",
  },
  promotion: {
    label: "Promotion Path",
    description: "Level up where you are",
    colour: "#16A34A",
  },
  job_search: {
    label: "Job Search Sprint",
    description: "Land your next role faster",
    colour: "#D97706",
  },
  career_clarity: {
    label: "Career Clarity",
    description: "Figure out what you actually want",
    colour: "#8B5CF6",
  },
} as const;

export type JourneyLane = keyof typeof JOURNEY_LANES;

export const STEP_TYPES = {
  cv_rewrite: { label: "CV Rewrite", icon: "FileText" },
  linkedin_rewrite: { label: "LinkedIn Rewrite", icon: "Linkedin" },
  interview_prep: { label: "Interview Prep", icon: "MessageSquare" },
  gap_analysis: { label: "Gap Analysis", icon: "BarChart3" },
  skill_plan: { label: "Skill Plan", icon: "BookOpen" },
  networking: { label: "Networking", icon: "Users" },
  application: { label: "Application", icon: "Send" },
  reflection: { label: "Reflection", icon: "Pencil" },
  evidence_capture: { label: "Evidence Capture", icon: "Trophy" },
  manager_prep: { label: "Manager Conversation", icon: "UserCheck" },
  values_assessment: { label: "Values Assessment", icon: "Heart" },
  custom: { label: "Custom", icon: "Sparkles" },
} as const;

export type StepType = keyof typeof STEP_TYPES;

export const RATE_LIMITS = {
  dailyGenerations: 20,
  dailyChatMessages: 100,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add shared constants for journey lanes, step types, and rate limits"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run the full dev environment**

Start Convex and Next.js in parallel:

```bash
npx convex dev &
npm run dev
```

- [ ] **Step 2: Walk through the full flow**

1. Visit `localhost:3000` — landing page renders with hero, journeys, how-it-works, CTA.
2. Click "Get started — it's free" → redirects to `/sign-up`.
3. Create an account → redirects to `/diagnostic` (404 is expected).
4. Navigate to `/dashboard` → app shell renders with sidebar, header, your name.
5. Click the Clerk user button → sign out → redirects to `/`.
6. Click "Sign in" in navbar → sign-in page renders.
7. Sign in → redirects to `/dashboard`.

- [ ] **Step 3: Verify Convex data**

Open the Convex dashboard (`npx convex dashboard`). Check the `users` table — your test user should appear with `clerkId`, `email`, `name`, and `profile: null`.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: Plan 1 complete — foundation with Next.js, Convex, Clerk, and landing page"
```

---

## Summary

After completing Plan 1, you have:

- **Next.js 16.2** project with App Router and Turbopack
- **Tailwind CSS** configured with a calm, minimal theme
- **Convex** with the full data model (all tables, all indexes)
- **Clerk** auth with sign-in, sign-up, and webhook user sync to Convex
- **Marketing layout** with navbar and footer
- **Landing page** with hero, four journey cards, how-it-works, and CTA
- **App shell** with sidebar navigation, header with user menu, and dashboard placeholder
- **Shared components** (Button) and constants (journey lanes, step types)

**Next plan:** Plan 2 — Diagnostic Engine (questionnaire → AI analysis → results page with Career Path Map)
