"use client";

import { useQuery } from "convex/react";
import { useSuspenseQuery } from "@/hooks/use-suspense-query";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StepWorkspace } from "@/components/journey/step-workspace";
import {
  buildChatSystemPrompt,
  buildJobListingsContext,
} from "@/lib/ai/prompts";

export function StepView({
  journeyId,
  stepId,
}: {
  journeyId: Id<"journeys">;
  stepId: Id<"steps">;
}) {
  const step = useSuspenseQuery(api.steps.getById, { stepId });
  const journey = useSuspenseQuery(api.journeys.getById, { journeyId });
  const user = useSuspenseQuery(api.users.getCurrentUser);
  const cachedJobs = useQuery(api.jobSearches.getLatest, { journeyId });

  if (!step || !journey) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center">
        <p className="text-muted-foreground">Step not found.</p>
      </div>
    );
  }

  const jobListingsContext = cachedJobs?.jobs
    ? buildJobListingsContext(cachedJobs.jobs)
    : undefined;

  const chatSystemPrompt = buildChatSystemPrompt({
    userName: user?.name ?? "there",
    stepType: step.type,
    stepTitle: step.title,
    lane: journey.lane,
    targetRole: journey.targetRole,
    currentRole: user?.profile?.currentRole ?? "Unknown",
    jobListingsContext: jobListingsContext || undefined,
  });

  return (
    <StepWorkspace
      step={step}
      journeyId={journeyId}
      chatSystemPrompt={chatSystemPrompt}
      targetRole={journey.targetRole ?? undefined}
      userLocation={user?.profile?.location}
    />
  );
}
