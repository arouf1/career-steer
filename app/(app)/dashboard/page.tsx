"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { WeekView } from "@/components/journey/week-view";
import { JOURNEY_LANES } from "@/lib/constants";
import Link from "next/link";
import {
  Loader2,
  ArrowRight,
  ClipboardList,
  Map,
  MessageCircle,
  Trophy,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const user = useQuery(api.users.getCurrentUser);
  const journey = useQuery(api.journeys.getActiveForUser);
  const roadmap = useQuery(
    api.roadmaps.getByJourneyId,
    journey ? { journeyId: journey._id } : "skip",
  );
  const allSteps = useQuery(
    api.steps.getAllByJourney,
    journey ? { journeyId: journey._id } : "skip",
  );

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your career journey starts here. Complete the diagnostic to get your
          personalised roadmap.
        </p>
        <Link href="/diagnostic">
          <Button className="mt-6" variant="accent" size="lg">
            <ClipboardList className="mr-2 h-4 w-4" />
            Start your diagnostic
          </Button>
        </Link>
      </div>
    );
  }

  const laneInfo = JOURNEY_LANES[journey.lane];

  if (!roadmap) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>
        <div className="mt-4 rounded-xl border border-border p-6">
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: laneInfo.colour }}
            />
            <span className="font-semibold">{laneInfo.label}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {laneInfo.description}
          </p>
          {journey.targetRole && (
            <p className="mt-1 text-sm">
              Target role: <span className="font-medium">{journey.targetRole}</span>
            </p>
          )}
          <p className="mt-4 text-muted-foreground">
            Your diagnostic is complete. Generate your personalised roadmap to
            get started.
          </p>
          <Link href={`/journey/${journey._id}/roadmap`}>
            <Button className="mt-4" variant="accent">
              <Map className="mr-2 h-4 w-4" />
              Generate your roadmap
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (journey.status === "completed") {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>

        <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-accent" />
          <h2 className="mt-3 text-lg font-semibold">
            Journey complete!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {journey.targetRole
              ? `You've finished your roadmap towards ${journey.targetRole}.`
              : "You've finished your career roadmap."}
          </p>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href={`/journey/${journey._id}/complete`}>
              <Button variant="accent">
                View summary
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/diagnostic">
              <Button variant="secondary">
                <Plus className="mr-1 h-4 w-4" />
                Start a new journey
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const steps = allSteps ?? [];
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const totalCount = steps.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentWeek =
    steps.find(
      (s) => s.status === "available" || s.status === "in_progress",
    )?.weekNumber ?? 1;

  const currentWeekSteps = steps.filter(
    (s) => s.weekNumber === currentWeek,
  );

  const weekCompletedSteps = currentWeekSteps.filter(
    (s) => s.status === "completed" || s.status === "skipped",
  ).length;
  const showCheckInPrompt =
    weekCompletedSteps > 0 && weekCompletedSteps >= currentWeekSteps.length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: laneInfo.colour }}
            />
            <span className="text-sm text-muted-foreground">
              {laneInfo.label}
            </span>
            {journey.targetRole && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">
                  {journey.targetRole}
                </span>
              </>
            )}
          </div>
        </div>
        <Link href={`/journey/${journey._id}/roadmap`}>
          <Button variant="secondary" size="sm">
            Full roadmap
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>

      {showCheckInPrompt && (
        <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 shrink-0 text-accent" />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                Week {currentWeek} complete — time for your check-in
              </p>
              <p className="text-xs text-muted-foreground">
                Reflect on your progress and unlock next week&apos;s steps.
              </p>
            </div>
            <Link href={`/journey/${journey._id}/check-in`}>
              <Button variant="accent" size="sm">
                Check in
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall progress</span>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{totalCount} steps ({progressPercent}%)
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-8">
        <WeekView
          weekNumber={currentWeek}
          steps={currentWeekSteps}
          journeyId={journey._id}
        />
      </div>
    </div>
  );
}
