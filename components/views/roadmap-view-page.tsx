"use client";

import { useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { RoadmapView } from "@/components/journey/roadmap-view";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function RoadmapViewPage({
  journeyId,
}: {
  journeyId: Id<"journeys">;
}) {
  const journey = useQuery(api.journeys.getById, {
    journeyId,
  });
  const roadmap = useQuery(api.roadmaps.getByJourneyId, {
    journeyId,
  });
  const steps = useQuery(api.steps.getAllByJourney, {
    journeyId,
  });

  const generateRoadmap = useAction(api.roadmaps.generateRoadmap);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (roadmap !== undefined && !roadmap && journey && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      generateRoadmap({ journeyId });
    }
  }, [roadmap, journey, journeyId, generateRoadmap]);

  if (journey === undefined || roadmap === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center">
        <p className="text-muted-foreground">Journey not found.</p>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-accent" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Generating your roadmap
        </h1>
        <p className="mt-2 text-muted-foreground">
          Career Steer is creating a personalised week-by-week plan based on
          your diagnostic results and career goals.
        </p>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allSteps: any[] = steps ?? [];
  const completedCount = allSteps.filter(
    (s: any) => s.status === "completed",
  ).length;
  const totalCount = allSteps.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentWeek =
    allSteps.find(
      (s: any) => s.status === "available" || s.status === "in_progress",
    )?.weekNumber ?? 1;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Your Roadmap</h1>
        <p className="mt-1 text-muted-foreground">{roadmap.overview}</p>

        <div className="mt-4 flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount}/{totalCount} steps ({progressPercent}%)
          </span>
        </div>
      </div>

      <RoadmapView
        journeyId={journeyId}
        milestones={roadmap.milestones}
        steps={allSteps}
        currentWeek={currentWeek}
      />
    </div>
  );
}
