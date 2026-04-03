"use client";

import { Lock, Circle, CheckCircle2 } from "lucide-react";
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

function StatusIcon({ status }: { status: Step["status"] }) {
  switch (status) {
    case "locked":
      return <Lock className="h-4 w-4 text-muted-foreground" />;
    case "completed":
    case "skipped":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    default:
      return <Circle className="h-4 w-4 text-accent" />;
  }
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
    <div className="space-y-6">
      {milestones.map((milestone) => {
        const weekSteps = stepsByWeek[milestone.weekNumber] ?? [];
        const isCurrent = milestone.weekNumber === currentWeek;

        return (
          <div
            key={milestone.weekNumber}
            className={`rounded-xl border p-5 transition-colors ${
              isCurrent
                ? "border-accent bg-accent/5"
                : "border-border bg-background"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  isCurrent
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {milestone.weekNumber}
              </span>
              <div>
                <h3 className="font-semibold">{milestone.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {milestone.description}
                </p>
              </div>
              {isCurrent && (
                <span className="ml-auto rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  Current week
                </span>
              )}
            </div>

            {weekSteps.length > 0 && (
              <div className="mt-4 space-y-2 pl-11">
                {weekSteps.map((step) => {
                  const isActionable =
                    step.status === "available" ||
                    step.status === "in_progress" ||
                    step.status === "completed";

                  const inner = (
                    <div
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                        isActionable
                          ? "cursor-pointer border-border hover:border-accent/40 hover:bg-muted/50"
                          : "border-border/50 opacity-60"
                      }`}
                    >
                      <StatusIcon status={step.status} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {step.title}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {STEP_TYPES[step.type]?.label ?? step.type}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
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
        );
      })}
    </div>
  );
}
