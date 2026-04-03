"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StepWorkspace } from "@/components/journey/step-workspace";
import { buildChatSystemPrompt } from "@/lib/ai/prompts";
import { Loader2 } from "lucide-react";

export default function StepPage({
  params,
}: {
  params: Promise<{ journeyId: string; stepId: string }>;
}) {
  const { journeyId, stepId } = use(params);
  const typedStepId = stepId as Id<"steps">;
  const typedJourneyId = journeyId as Id<"journeys">;

  const step = useQuery(api.steps.getById, { stepId: typedStepId });
  const journey = useQuery(api.journeys.getById, {
    journeyId: typedJourneyId,
  });
  const user = useQuery(api.users.getCurrentUser);

  if (step === undefined || journey === undefined || user === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!step || !journey) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center">
        <p className="text-muted-foreground">Step not found.</p>
      </div>
    );
  }

  const chatSystemPrompt = buildChatSystemPrompt({
    userName: user?.name ?? "there",
    stepType: step.type,
    stepTitle: step.title,
    lane: journey.lane,
    targetRole: journey.targetRole,
    currentRole: user?.profile?.currentRole ?? "Unknown",
  });

  return (
    <StepWorkspace
      step={step}
      journeyId={typedJourneyId}
      chatSystemPrompt={chatSystemPrompt}
    />
  );
}
