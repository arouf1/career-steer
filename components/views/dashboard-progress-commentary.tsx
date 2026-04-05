"use client";

import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { runDashboardCommentaryOnce } from "@/lib/dashboard-commentary-flight";

type Props = {
  journeyId: Id<"journeys">;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
};

export function DashboardProgressCommentary({
  journeyId,
  completedCount,
  totalCount,
  progressPercent,
}: Props) {
  const gate = useQuery(api.dashboardCommentary.getDashboardCommentaryState, {
    journeyId,
  });
  const ensure = useAction(api.dashboardCommentary.ensureDashboardCommentary);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [giveUp, setGiveUp] = useState(false);

  const showCommentarySection = completedCount > 0;

  useEffect(() => {
    setCommentary(null);
    setGiveUp(false);
  }, [journeyId, gate?.contentFingerprint]);

  useEffect(() => {
    if (!showCommentarySection || !gate?.showCommentary || !gate.contentFingerprint || giveUp)
      return;

    const key = `${journeyId}:${gate.contentFingerprint}`;
    void runDashboardCommentaryOnce(key, async () => {
      const result = await ensure({ journeyId });
      if (result.kind === "success") {
        setCommentary(result.commentary);
        return;
      }
      if (
        result.kind === "failure" ||
        result.kind === "no_roadmap" ||
        result.kind === "not_authenticated" ||
        result.kind === "forbidden"
      ) {
        setGiveUp(true);
      }
    });
  }, [
    showCommentarySection,
    gate?.showCommentary,
    gate?.contentFingerprint,
    journeyId,
    ensure,
    giveUp,
  ]);

  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/20 p-4">
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

      {showCommentarySection && gate !== null && (
        <div className="mt-4 border-t border-border pt-4">
          {commentary && gate?.showCommentary ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your progress
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                {commentary}
              </p>
            </>
          ) : gate?.showCommentary === false ? null : !giveUp ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
