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
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
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
