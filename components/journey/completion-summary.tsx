"use client";

import { Trophy, CheckCircle2, CalendarDays, Clock } from "lucide-react";
import { STEP_TYPES, type StepType } from "@/lib/constants";

interface CompletionSummaryProps {
  stepsCompleted: number;
  stepsTotal: number;
  weeksActive: number;
  startedAt: number;
  stepsByType: Record<string, number>;
  targetRole: string | null;
}

export function CompletionSummary({
  stepsCompleted,
  stepsTotal,
  weeksActive,
  startedAt,
  stepsByType,
  targetRole,
}: CompletionSummaryProps) {
  const daysSinceStart = Math.max(
    1,
    Math.round((Date.now() - startedAt) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-8 text-center">
        <Trophy className="mx-auto h-12 w-12 text-accent" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          Journey complete!
        </h2>
        <p className="mt-2 text-muted-foreground">
          {targetRole
            ? `You've completed your roadmap towards becoming a ${targetRole}. Well done.`
            : "You've completed your career roadmap. Well done."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-5 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
          <p className="mt-2 text-2xl font-bold">
            {stepsCompleted}/{stepsTotal}
          </p>
          <p className="text-sm text-muted-foreground">Steps completed</p>
        </div>

        <div className="rounded-xl border border-border p-5 text-center">
          <CalendarDays className="mx-auto h-6 w-6 text-accent" />
          <p className="mt-2 text-2xl font-bold">{weeksActive}</p>
          <p className="text-sm text-muted-foreground">Weeks active</p>
        </div>

        <div className="rounded-xl border border-border p-5 text-center">
          <Clock className="mx-auto h-6 w-6 text-accent" />
          <p className="mt-2 text-2xl font-bold">{daysSinceStart}</p>
          <p className="text-sm text-muted-foreground">Days since start</p>
        </div>
      </div>

      {Object.keys(stepsByType).length > 0 && (
        <div className="rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold">Accomplishments by type</h3>
          <div className="mt-4 space-y-2">
            {Object.entries(stepsByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const label =
                  STEP_TYPES[type as StepType]?.label ?? type;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
