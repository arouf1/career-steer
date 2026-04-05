"use client";

import { StepCard } from "@/components/journey/step-card";
import type { Id } from "@/convex/_generated/dataModel";
import type { StepType } from "@/lib/constants";

interface Step {
  _id: Id<"steps">;
  weekNumber: number;
  order: number;
  type: StepType;
  title: string;
  description: string;
  status: "locked" | "available" | "in_progress" | "completed" | "skipped";
}

interface WeekViewProps {
  weekNumber: number;
  steps: Step[];
  journeyId: Id<"journeys">;
}

export function WeekView({ weekNumber, steps, journeyId }: WeekViewProps) {
  const completedCount = steps.filter(
    (s) =>
      s.status === "completed" || s.status === "skipped",
  ).length;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-lg font-semibold">Week {weekNumber}</h3>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{steps.length} complete
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {steps.map((step) => (
          <StepCard key={step._id} step={step} journeyId={journeyId} />
        ))}
      </div>
    </div>
  );
}
