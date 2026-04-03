"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { StepType } from "@/lib/constants";
import { STEP_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { GenerateButton } from "./generate-button";
import { StepOutput } from "./step-output";
import { ChatAssistant } from "./chat-assistant";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface StepWorkspaceProps {
  step: {
    _id: Id<"steps">;
    type: StepType;
    title: string;
    description: string;
    status: "locked" | "available" | "in_progress" | "completed" | "skipped";
    generationStatus: "idle" | "generating" | "completed" | "failed";
    output: unknown;
  };
  journeyId: Id<"journeys">;
  chatSystemPrompt: string;
}

export function StepWorkspace({
  step,
  journeyId,
  chatSystemPrompt,
}: StepWorkspaceProps) {
  const updateStatus = useMutation(api.steps.updateStatus);
  const typeInfo = STEP_TYPES[step.type];

  const handleMarkComplete = async () => {
    await updateStatus({ stepId: step._id, status: "completed" });
  };

  return (
    <div className="mx-auto max-w-3xl pb-20">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/journey/${journeyId}/roadmap`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Roadmap
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {typeInfo?.label ?? step.type}
          </span>
          {step.status === "completed" && (
            <span className="flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {step.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{step.description}</p>
      </div>

      <div className="flex items-center gap-3">
        <GenerateButton
          stepId={step._id}
          generationStatus={step.generationStatus}
        />
        {step.status !== "completed" &&
          step.status !== "locked" && (
            <Button variant="secondary" onClick={handleMarkComplete}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark complete
            </Button>
          )}
      </div>

      {step.output && (
        <div className="mt-8 rounded-xl border border-border p-6">
          <StepOutput stepType={step.type} output={step.output} />
        </div>
      )}

      <ChatAssistant systemPrompt={chatSystemPrompt} />
    </div>
  );
}
