"use client";

import { Suspense, useMemo, useState } from "react";
import { useConvexAuth } from "convex/react";
import { useSuspenseQuery } from "@/hooks/use-suspense-query";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekView } from "@/components/journey/week-view";
import { JOURNEY_LANES } from "@/lib/constants";
import { ViewSkeleton } from "@/components/ui/view-skeleton";
import { DashboardProgressCommentary } from "@/components/views/dashboard-progress-commentary";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardList,
  Map,
  MessageCircle,
  Trophy,
  Plus,
} from "lucide-react";

export function DashboardView() {
  const { isLoading: authLoading } = useConvexAuth();
  if (authLoading) {
    return <ViewSkeleton />;
  }
  return <DashboardViewWithData />;
}

function DashboardViewWithData() {
  const user = useSuspenseQuery(api.users.getCurrentUser);
  const journey = useSuspenseQuery(api.journeys.getActiveForUser);
  const allJourneys = useSuspenseQuery(api.journeys.getAllByUser);

  if (!journey) {
    const pastJourneyCount = allJourneys?.length ?? 0;
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {pastJourneyCount > 0
            ? `You have ${pastJourneyCount} past journey${pastJourneyCount === 1 ? "" : "s"}. Resume one from the sidebar, or start fresh.`
            : "Your career journey starts here. Complete the diagnostic to get your personalised roadmap."}
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

  return (
    <Suspense fallback={<ViewSkeleton />}>
      <ActiveJourneyDashboard
        userName={user?.name}
        journeyId={journey._id}
        journey={journey}
      />
    </Suspense>
  );
}

function ActiveJourneyDashboard({
  userName,
  journeyId,
  journey,
}: {
  userName: string | undefined;
  journeyId: Id<"journeys">;
  journey: {
    _id: Id<"journeys">;
    lane: string;
    targetRole: string | null;
    status: string;
  };
}) {
  const roadmap = useSuspenseQuery(api.roadmaps.getByJourneyId, {
    journeyId,
  });
  const allSteps = useSuspenseQuery(api.steps.getAllByJourney, {
    journeyId,
  });

  const stepsList: Doc<"steps">[] = useMemo(
    () => allSteps ?? [],
    [allSteps],
  );
  const weekNumbers = useMemo(() => {
    const unique = new Set<number>();
    for (const s of stepsList) unique.add(s.weekNumber);
    return Array.from(unique).sort((a, b) => a - b);
  }, [stepsList]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const completedCount = useMemo(
    () => stepsList.filter((s) => s.status === "completed").length,
    [stepsList],
  );
  const totalCount = stepsList.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentWeek = useMemo(() => {
    const found = stepsList.find(
      (s) => s.status === "available" || s.status === "in_progress",
    );
    return found?.weekNumber ?? 1;
  }, [stepsList]);

  const currentWeekSteps = useMemo(
    () => stepsList.filter((s) => s.weekNumber === currentWeek),
    [stepsList, currentWeek],
  );

  const viewWeek =
    selectedWeek !== null && weekNumbers.includes(selectedWeek)
      ? selectedWeek
      : currentWeek;

  const viewWeekSteps = useMemo(
    () => stepsList.filter((s) => s.weekNumber === viewWeek),
    [stepsList, viewWeek],
  );

  const weekCompletedSteps = useMemo(
    () =>
      currentWeekSteps.filter(
        (s) => s.status === "completed" || s.status === "skipped",
      ).length,
    [currentWeekSteps],
  );
  const showCheckInPrompt =
    weekCompletedSteps > 0 && weekCompletedSteps >= currentWeekSteps.length;

  const laneInfo = JOURNEY_LANES[journey.lane as keyof typeof JOURNEY_LANES];

  if (!roadmap) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{userName ? `, ${userName}` : ""}
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
              Target role:{" "}
              <span className="font-medium">{journey.targetRole}</span>
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
          Welcome back{userName ? `, ${userName}` : ""}
        </h1>

        <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-accent" />
          <h2 className="mt-3 text-lg font-semibold">Journey complete!</h2>
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{userName ? `, ${userName}` : ""}
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
                <span className="text-muted-foreground">&middot;</span>
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

      <DashboardProgressCommentary
        journeyId={journey._id}
        completedCount={completedCount}
        totalCount={totalCount}
        progressPercent={progressPercent}
      />

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

      <div className="mt-8">
        {weekNumbers.length > 1 ? (
          <Tabs
            value={String(viewWeek)}
            onValueChange={(v) => setSelectedWeek(Number(v))}
            className="gap-4"
          >
            <TabsList className="flex w-full flex-col items-stretch gap-2 sm:inline-flex sm:flex-row sm:flex-wrap sm:gap-1 sm:items-center sm:justify-start">
              {weekNumbers.map((w) => {
                const weekSteps = stepsList.filter((s) => s.weekNumber === w);
                const done = weekSteps.filter(
                  (s) =>
                    s.status === "completed" || s.status === "skipped",
                ).length;
                const allDone =
                  weekSteps.length > 0 && done === weekSteps.length;
                return (
                  <TabsTrigger
                    key={w}
                    value={String(w)}
                    className="h-auto min-h-9 w-full justify-center gap-1.5 whitespace-normal text-center data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:!shadow-none data-[state=active]:text-card-foreground dark:data-[state=active]:bg-card dark:data-[state=active]:text-card-foreground sm:h-[calc(100%-1px)] sm:w-auto sm:flex-1 sm:justify-center sm:whitespace-nowrap"
                  >
                    {allDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    Week {w}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        ) : null}
        <div className={weekNumbers.length > 1 ? "mt-4" : undefined}>
          <WeekView
            weekNumber={viewWeek}
            steps={viewWeekSteps}
            journeyId={journey._id}
          />
        </div>
      </div>
    </div>
  );
}
