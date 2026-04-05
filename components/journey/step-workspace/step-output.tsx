"use client";

import { Suspense } from "react";
import type { StepType } from "@/lib/constants";
import type { Id } from "@/convex/_generated/dataModel";
import type { EvidenceCaptureOutput, GapAnalysisOutput } from "@/lib/ai/schemas";
import { CvRewriteOutputDisplay } from "./outputs/cv-rewrite-output";
import { GapAnalysisOutputDisplay } from "./outputs/gap-analysis-output";
import { InterviewPrepOutputDisplay } from "./outputs/interview-prep-output";
import { EvidenceCaptureOutputDisplay } from "./outputs/evidence-capture-output";
import { GenericOutputDisplay } from "./outputs/generic-output";
import { ViewSkeleton } from "@/components/ui/view-skeleton";

interface StepOutputProps {
  stepType: StepType;
  output: unknown;
  stepId: Id<"steps">;
  journeyId: Id<"journeys">;
  targetRole?: string;
  marketInsightsSlot?: React.ReactNode;
}

export function StepOutput({ stepType, output, stepId, journeyId, targetRole, marketInsightsSlot }: StepOutputProps) {
  if (!output) return null;

  switch (stepType) {
    case "cv_rewrite":
      return <CvRewriteOutputDisplay output={output as never} />;
    case "gap_analysis": {
      const gaOutput = output as Record<string, unknown>;
      if (Array.isArray(gaOutput.tasks) && gaOutput.tasks.length > 0) {
        return (
          <Suspense fallback={<ViewSkeleton />}>
            <GapAnalysisOutputDisplay
              output={gaOutput as unknown as GapAnalysisOutput}
              stepId={stepId}
              journeyId={journeyId}
              targetRole={targetRole}
              marketInsightsSlot={marketInsightsSlot}
            />
          </Suspense>
        );
      }
      return (
        <GapAnalysisOutputDisplay
          output={gaOutput as unknown as GapAnalysisOutput}
          marketInsightsSlot={marketInsightsSlot}
        />
      );
    }
    case "interview_prep":
      return <InterviewPrepOutputDisplay output={output as never} />;
    case "evidence_capture": {
      const ecOutput = output as Record<string, unknown>;
      if (Array.isArray(ecOutput.tasks)) {
        return (
          <Suspense fallback={<ViewSkeleton />}>
            <EvidenceCaptureOutputDisplay
              output={ecOutput as unknown as EvidenceCaptureOutput}
              stepId={stepId}
              journeyId={journeyId}
              targetRole={targetRole}
            />
          </Suspense>
        );
      }
      return <GenericOutputDisplay output={output as { content: string }} />;
    }
    default:
      return <GenericOutputDisplay output={output as { content: string }} />;
  }
}
