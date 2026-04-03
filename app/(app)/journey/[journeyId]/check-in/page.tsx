"use client";

import { use, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CheckInForm } from "@/components/journey/check-in-form";
import { CheckInResult } from "@/components/journey/check-in-result";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CheckInPage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = use(params);
  const typedJourneyId = journeyId as Id<"journeys">;

  const allSteps = useQuery(api.steps.getAllByJourney, {
    journeyId: typedJourneyId,
  });

  const currentWeek = allSteps
    ? (() => {
        const activeStep = allSteps.find(
          (s: any) => s.status === "available" || s.status === "in_progress",
        );
        if (activeStep) return activeStep.weekNumber;
        const maxWeek = Math.max(...allSteps.map((s: any) => s.weekNumber), 1);
        return maxWeek;
      })()
    : null;

  const existingLog = useQuery(
    api.progressLogs.getByJourneyAndWeek,
    currentWeek !== null
      ? { journeyId: typedJourneyId, weekNumber: currentWeek }
      : "skip",
  );

  const generateCheckIn = useAction(api.progressLogs.generateCheckIn);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    encouragement: string;
    updatedRecommendations: string[];
  } | null>(null);

  if (allSteps === undefined || currentWeek === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const weekSteps = allSteps.filter((s: any) => s.weekNumber === currentWeek);
  const stepsCompleted = weekSteps.filter(
    (s: any) => s.status === "completed" || s.status === "skipped",
  ).length;
  const stepsTotal = weekSteps.length;

  const showResult = result ?? existingLog;

  async function handleSubmit(
    reflection: string | null,
    blockers: string | null,
  ) {
    setIsSubmitting(true);
    try {
      const response = await generateCheckIn({
        journeyId: typedJourneyId,
        weekNumber: currentWeek!,
        userReflection: reflection,
        blockers,
      });
      setResult(response as { encouragement: string; updatedRecommendations: string[] });
    } finally {
      setIsSubmitting(false);
    }
  }

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
        {showResult ? (
          <CheckInResult
            encouragement={showResult.encouragement}
            recommendations={showResult.updatedRecommendations}
          />
        ) : (
          <CheckInForm
            weekNumber={currentWeek}
            stepsCompleted={stepsCompleted}
            stepsTotal={stepsTotal}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
