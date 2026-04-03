"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CompletionSummary } from "@/components/journey/completion-summary";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default function CompletePage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = use(params);
  const typedJourneyId = journeyId as Id<"journeys">;

  const stats = useQuery(api.journeys.getCompletionStats, {
    journeyId: typedJourneyId,
  });

  if (stats === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center">
        <p className="text-muted-foreground">Journey not found.</p>
      </div>
    );
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

      <CompletionSummary
        stepsCompleted={stats.stepsCompleted}
        stepsTotal={stats.stepsTotal}
        weeksActive={stats.weeksActive}
        startedAt={stats.startedAt}
        stepsByType={stats.stepsByType}
        targetRole={stats.targetRole}
      />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/diagnostic" className="flex-1">
          <Button variant="accent" size="lg" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Start a new journey
          </Button>
        </Link>
        <Link href="/dashboard" className="flex-1">
          <Button variant="secondary" size="lg" className="w-full">
            Back to dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
