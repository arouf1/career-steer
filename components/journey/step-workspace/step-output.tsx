"use client";

import type { StepType } from "@/lib/constants";
import type { Id } from "@/convex/_generated/dataModel";
import type { EvidenceCaptureOutput } from "@/lib/ai/schemas";
import { CvRewriteOutputDisplay } from "./outputs/cv-rewrite-output";
import { GapAnalysisOutputDisplay } from "./outputs/gap-analysis-output";
import { InterviewPrepOutputDisplay } from "./outputs/interview-prep-output";
import { EvidenceCaptureOutputDisplay } from "./outputs/evidence-capture-output";
import { GenericOutputDisplay } from "./outputs/generic-output";

interface StepOutputProps {
  stepType: StepType;
  output: unknown;
  stepId: Id<"steps">;
  journeyId: Id<"journeys">;
  targetRole?: string;
}

export function StepOutput({ stepType, output, stepId, journeyId, targetRole }: StepOutputProps) {
  if (!output) return null;

  switch (stepType) {
    case "cv_rewrite":
      return <CvRewriteOutputDisplay output={output as never} />;
    case "gap_analysis":
      return <GapAnalysisOutputDisplay output={output as never} />;
    case "interview_prep":
      return <InterviewPrepOutputDisplay output={output as never} />;
    case "evidence_capture": {
      const ecOutput = output as Record<string, unknown>;
      if (Array.isArray(ecOutput.tasks)) {
        return (
          <EvidenceCaptureOutputDisplay
            output={ecOutput as unknown as EvidenceCaptureOutput}
            stepId={stepId}
            journeyId={journeyId}
            targetRole={targetRole}
          />
        );
      }
      return <GenericOutputDisplay output={output as { content: string }} />;
    }
    default:
      return <GenericOutputDisplay output={output as { content: string }} />;
  }
}
