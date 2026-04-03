"use client";

import type { StepType } from "@/lib/constants";
import { CvRewriteOutputDisplay } from "./outputs/cv-rewrite-output";
import { GapAnalysisOutputDisplay } from "./outputs/gap-analysis-output";
import { InterviewPrepOutputDisplay } from "./outputs/interview-prep-output";
import { GenericOutputDisplay } from "./outputs/generic-output";

interface StepOutputProps {
  stepType: StepType;
  output: unknown;
}

export function StepOutput({ stepType, output }: StepOutputProps) {
  if (!output) return null;

  switch (stepType) {
    case "cv_rewrite":
      return <CvRewriteOutputDisplay output={output as never} />;
    case "gap_analysis":
      return <GapAnalysisOutputDisplay output={output as never} />;
    case "interview_prep":
      return <InterviewPrepOutputDisplay output={output as never} />;
    default:
      return <GenericOutputDisplay output={output as { content: string }} />;
  }
}
