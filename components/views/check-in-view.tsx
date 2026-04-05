"use client";

import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@/hooks/use-suspense-query";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CheckInForm } from "@/components/journey/check-in-form";
import { CheckInResult } from "@/components/journey/check-in-result";
import { Button } from "@/components/ui/button";
import { ViewSkeleton } from "@/components/ui/view-skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function CheckInView({
  journeyId,
}: {
  journeyId: Id<"journeys">;
}) {
  const allSteps = useSuspenseQuery(api.steps.getAllByJourney, { journeyId });

  const currentWeek = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeStep = allSteps.find(
      (s: any) => s.status === "available" || s.status === "in_progress",
    );
    if (activeStep) return activeStep.weekNumber as number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maxWeek = Math.max(...allSteps.map((s: any) => s.weekNumber), 1);
    return maxWeek;
  })();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weekSteps = allSteps.filter(
    (s: any) => s.weekNumber === currentWeek,
  );
  const stepsCompleted = weekSteps.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.status === "completed" || s.status === "skipped",
  ).length;
  const stepsTotal = weekSteps.length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">
        Week {currentWeek} check-in
      </h1>
      <p className="mt-1 text-muted-foreground">
        Reflect on your progress and get personalised recommendations for next
        week.
      </p>

      <div className="mt-8">
        <Suspense fallback={<ViewSkeleton />}>
          <CheckInContent
            journeyId={journeyId}
            currentWeek={currentWeek}
            stepsCompleted={stepsCompleted}
            stepsTotal={stepsTotal}
          />
        </Suspense>
      </div>
    </div>
  );
}

function CheckInContent({
  journeyId,
  currentWeek,
  stepsCompleted,
  stepsTotal,
}: {
  journeyId: Id<"journeys">;
  currentWeek: number;
  stepsCompleted: number;
  stepsTotal: number;
}) {
  const existingLog = useSuspenseQuery(api.progressLogs.getByJourneyAndWeek, {
    journeyId,
    weekNumber: currentWeek,
  });

  const generateCheckIn = useAction(api.progressLogs.generateCheckIn);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    encouragement: string;
    updatedRecommendations: string[];
  } | null>(null);

  const showResult = result ?? existingLog;

  async function handleSubmit(
    reflection: string | null,
    blockers: string | null,
  ) {
    setIsSubmitting(true);
    try {
      const response = await generateCheckIn({
        journeyId,
        weekNumber: currentWeek,
        userReflection: reflection,
        blockers,
      });
      setResult(
        response as {
          encouragement: string;
          updatedRecommendations: string[];
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (showResult) {
    return (
      <CheckInResult
        encouragement={showResult.encouragement}
        recommendations={showResult.updatedRecommendations}
      />
    );
  }

  return (
    <CheckInForm
      weekNumber={currentWeek}
      stepsCompleted={stepsCompleted}
      stepsTotal={stepsTotal}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    />
  );
}
