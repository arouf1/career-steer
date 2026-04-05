"use client";

import { Lock, CheckCircle2, Check, Loader2 } from "lucide-react";
import { STEP_TYPES, type StepType } from "@/lib/constants";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

interface Step {
  _id: Id<"steps">;
  weekNumber: number;
  order: number;
  type: StepType;
  title: string;
  description: string;
  status: "locked" | "available" | "in_progress" | "completed" | "skipped";
}

interface Milestone {
  weekNumber: number;
  title: string;
  description: string;
}

interface RoadmapViewProps {
  journeyId: Id<"journeys">;
  milestones: Milestone[];
  steps: Step[];
  currentWeek: number;
}

type MilestoneState = "completed" | "current" | "upcoming";

function getMilestoneState(
  weekNumber: number,
  currentWeek: number,
  weekSteps: Step[],
): MilestoneState {
  if (weekNumber === currentWeek) return "current";
  const allDone =
    weekSteps.length > 0 &&
    weekSteps.every((s) => s.status === "completed" || s.status === "skipped");
  if (allDone || weekNumber < currentWeek) return "completed";
  return "upcoming";
}

function MilestoneNode({ state }: { state: MilestoneState }) {
  if (state === "completed") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-white ring-4 ring-success/10">
        <Check className="h-5 w-5" strokeWidth={3} />
      </div>
    );
  }
  if (state === "current") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-white shadow-[0_0_0_6px_rgba(79,70,229,0.1)]">
        <div className="h-3 w-3 animate-pulse rounded-full bg-accent" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white">
      <Lock className="h-4 w-4 text-muted-foreground/50" />
    </div>
  );
}

function TimelineConnector({ state }: { state: MilestoneState }) {
  const colourClass =
    state === "completed"
      ? "bg-success"
      : state === "current"
        ? "bg-gradient-to-b from-accent to-border"
        : "bg-border/50";

  return <div className={`mt-2 w-0.5 flex-1 rounded-full ${colourClass}`} />;
}

function StepStatusIcon({ status }: { status: Step["status"] }) {
  switch (status) {
    case "completed":
    case "skipped":
      return <CheckCircle2 className="h-5 w-5 text-success/80" />;
    case "in_progress":
      return (
        <div className="relative flex h-5 w-5 items-center justify-center text-accent">
          <Loader2
            className="absolute h-5 w-5 animate-spin"
            style={{ animationDuration: "3s" }}
          />
          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
        </div>
      );
    case "available":
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-border transition-colors group-hover:border-accent">
          <div className="h-1.5 w-1.5 rounded-full bg-transparent transition-colors group-hover:bg-accent/20" />
        </div>
      );
    default:
      return <Lock className="h-4 w-4 text-muted-foreground/40" />;
  }
}

function MilestoneStateBadge({ state }: { state: MilestoneState }) {
  if (state === "completed") {
    return (
      <span className="rounded border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-success">
        Completed
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-accent/20 bg-accent/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-accent">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
        Current week
      </span>
    );
  }
  return (
    <span className="rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      Locked
    </span>
  );
}

export function RoadmapView({
  journeyId,
  milestones,
  steps,
  currentWeek,
}: RoadmapViewProps) {
  const stepsByWeek = steps.reduce<Record<number, Step[]>>((acc, step) => {
    if (!acc[step.weekNumber]) acc[step.weekNumber] = [];
    acc[step.weekNumber].push(step);
    return acc;
  }, {});

  return (
    <div>
      {milestones.map((milestone, index) => {
        const weekSteps = stepsByWeek[milestone.weekNumber] ?? [];
        const state = getMilestoneState(
          milestone.weekNumber,
          currentWeek,
          weekSteps,
        );
        const isLast = index === milestones.length - 1;

        return (
          <div key={milestone.weekNumber} className="flex gap-5">
            {/* Timeline track */}
            <div className="flex flex-col items-center">
              <MilestoneNode state={state} />
              {!isLast && <TimelineConnector state={state} />}
            </div>

            {/* Milestone card */}
            <div className="min-w-0 flex-1 pb-8">
              <div
                className={`overflow-hidden rounded-2xl transition-all ${
                  state === "current"
                    ? "border-2 border-accent bg-white shadow-[0_12px_30px_-4px_rgba(79,70,229,0.12),0_0_0_1px_rgba(79,70,229,0.1)]"
                    : state === "completed"
                      ? "border border-success/30 bg-white shadow-sm hover:border-success/50"
                      : "border border-dashed border-border/70 bg-muted/30 opacity-80"
                }`}
              >
                {state === "current" && (
                  <div className="h-1.5 w-full bg-accent" />
                )}

                {/* Card header */}
                <div
                  className={`flex items-start justify-between gap-3 p-5 ${
                    state === "completed"
                      ? "border-b border-border/50 bg-success/[0.03]"
                      : state === "current"
                        ? "border-b border-border/50"
                        : "border-b border-border/30 bg-muted/20"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2.5">
                      <h3
                        className={`font-bold ${
                          state === "upcoming"
                            ? "text-base text-muted-foreground"
                            : state === "current"
                              ? "text-lg tracking-tight text-foreground"
                              : "text-base text-foreground"
                        }`}
                      >
                        {milestone.title}
                      </h3>
                      <MilestoneStateBadge state={state} />
                    </div>
                    <p
                      className={`text-sm ${
                        state === "upcoming"
                          ? "text-muted-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {milestone.description}
                    </p>
                  </div>
                </div>

                {/* Step rows */}
                {weekSteps.length > 0 && (
                  <div className={state === "current" ? "bg-background/50" : ""}>
                    {weekSteps.map((step) => {
                      const isActionable =
                        step.status === "available" ||
                        step.status === "in_progress" ||
                        step.status === "completed";

                      const inner = (
                        <div
                          className={`group flex items-start gap-3.5 border-t px-5 py-3.5 transition-colors ${
                            step.status === "in_progress"
                              ? "border-border/60 bg-white shadow-[inset_4px_0_0_0_var(--color-accent)]"
                              : step.status === "completed" ||
                                  step.status === "skipped"
                                ? "border-border/40 hover:bg-muted/30"
                                : step.status === "available"
                                  ? "cursor-pointer border-border/60 hover:bg-white"
                                  : "pointer-events-none border-border/30"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            <StepStatusIcon status={step.status} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  step.status === "completed" ||
                                  step.status === "skipped"
                                    ? "text-muted-foreground line-through decoration-border"
                                    : step.status === "in_progress"
                                      ? "font-bold text-foreground"
                                      : step.status === "available"
                                        ? "text-foreground transition-colors group-hover:text-accent"
                                        : "text-muted-foreground/60"
                                }`}
                              >
                                {step.title}
                              </span>
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  step.status === "in_progress"
                                    ? "border border-accent/20 bg-accent/5 font-bold uppercase tracking-wider text-accent"
                                    : "border border-border bg-muted text-muted-foreground"
                                }`}
                              >
                                {STEP_TYPES[step.type]?.label ?? step.type}
                              </span>
                            </div>
                            <p
                              className={`truncate text-sm ${
                                step.status === "locked"
                                  ? "text-muted-foreground/50"
                                  : step.status === "completed" ||
                                      step.status === "skipped"
                                    ? "text-muted-foreground/60"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );

                      if (isActionable) {
                        return (
                          <Link
                            key={step._id}
                            href={`/journey/${journeyId}/step/${step._id}`}
                          >
                            {inner}
                          </Link>
                        );
                      }

                      return <div key={step._id}>{inner}</div>;
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
