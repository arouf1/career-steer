"use client";

import { Suspense, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useSuspenseQuery } from "@/hooks/use-suspense-query";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { StepType } from "@/lib/constants";
import { STEP_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewSkeleton } from "@/components/ui/view-skeleton";
import { GenerateButton } from "./generate-button";
import { StepOutput } from "./step-output";
import { ChatAssistant } from "./chat-assistant";
import { JobListings, type JobResult } from "./job-listings";
import { JobInsightsCommentary } from "./job-insights-commentary";
import { buildJobListingsContext } from "@/lib/ai/prompts";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { LocationValue } from "@/lib/location";
import type { EvidenceCaptureOutput, GapAnalysisOutput, JobInsights } from "@/lib/ai/schemas";

const JOB_LISTING_STEP_TYPES: ReadonlySet<StepType> = new Set([
  "gap_analysis",
  "cv_rewrite",
  "application",
  "interview_prep",
  "skill_plan",
]);

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
  targetRole?: string;
  userLocation?: LocationValue;
}

export function StepWorkspace({
  step,
  journeyId,
  chatSystemPrompt,
  targetRole,
  userLocation,
}: StepWorkspaceProps) {
  const updateStatus = useMutation(api.steps.updateStatus);
  const generateStepOutput = useAction(api.steps.generateStepOutput);
  const typeInfo = STEP_TYPES[step.type];
  const showJobListings =
    JOB_LISTING_STEP_TYPES.has(step.type) && !!targetRole && !!userLocation;

  const [jobSearchId, setJobSearchId] = useState<Id<"jobSearches"> | null>(
    null,
  );
  const [freshJobs, setFreshJobs] = useState<JobResult[] | null>(null);

  const handleJobSearchId = useCallback(
    (id: Id<"jobSearches"> | null) => setJobSearchId(id),
    [],
  );

  const handleJobsFetched = useCallback((jobs: JobResult[]) => {
    setFreshJobs(jobs);
  }, []);

  const isEvidenceCapture = step.type === "evidence_capture";
  const isGapAnalysis = step.type === "gap_analysis";
  const needsEntries = isEvidenceCapture || isGapAnalysis;
  const stepEntries = useQuery(
    api.stepEntries.getByStep,
    needsEntries ? { stepId: step._id } : "skip",
  );

  const effectiveSystemPrompt = useMemo(() => {
    let prompt = chatSystemPrompt;

    if (freshJobs && freshJobs.length > 0 && !prompt.includes("JOB LISTINGS VISIBLE TO THE USER")) {
      const jobContext = buildJobListingsContext(freshJobs);
      if (jobContext) {
        prompt = `${prompt}\n\n${jobContext}\n\nYou may reference these job listings when answering questions. If the user asks about specific postings, companies, or qualifications, use the data above.`;
      }
    }

    if (isEvidenceCapture && stepEntries && stepEntries.length > 0) {
      const ecOutput = step.output as EvidenceCaptureOutput | null;
      const tasks = ecOutput?.tasks;

      const lines = stepEntries
        .filter((e) => e.content.trim().length > 0)
        .sort((a, b) => a.taskIndex - b.taskIndex)
        .map((e) => {
          const title = tasks?.[e.taskIndex]?.title ?? `Task ${e.taskIndex + 1}`;
          return `### ${title}\n${e.content}`;
        });

      if (lines.length > 0) {
        prompt = `${prompt}\n\nUSER'S EVIDENCE CAPTURE RESPONSES:\nThe user has written the following responses for this step. You can see exactly what they have written. Reference their actual text when giving feedback, critiquing, or suggesting improvements.\n\n${lines.join("\n\n")}`;
      }
    }

    if (isGapAnalysis && stepEntries && stepEntries.length > 0) {
      const gaOutput = step.output as GapAnalysisOutput | null;
      const tasks = gaOutput?.tasks;

      const lines = stepEntries
        .filter((e) => e.content.trim().length > 0)
        .sort((a, b) => a.taskIndex - b.taskIndex)
        .map((e) => {
          const title = tasks?.[e.taskIndex]?.title ?? `Skill ${e.taskIndex + 1}`;
          return `### ${title}\n${e.content}`;
        });

      if (lines.length > 0) {
        prompt = `${prompt}\n\nUSER'S GAP ANALYSIS RESPONSES:\nThe user has written the following skill evidence and action plans. You can see exactly what they have written. Reference their actual text when giving feedback or suggesting improvements.\n\n${lines.join("\n\n")}`;
      }
    }

    return prompt;
  }, [chatSystemPrompt, freshJobs, isEvidenceCapture, isGapAnalysis, stepEntries, step.output]);

  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (step.generationStatus !== "idle") return;
    if (step.status === "locked") return;
    if (hasTriggeredRef.current) return;
    if (showJobListings && !jobSearchId) return;
    hasTriggeredRef.current = true;
    generateStepOutput({ stepId: step._id });
  }, [step.generationStatus, step.status, step._id, generateStepOutput, showJobListings, jobSearchId]);

  const handleMarkComplete = async () => {
    await updateStatus({ stepId: step._id, status: "completed" });
  };

  const isGenerating =
    step.generationStatus === "idle" || step.generationStatus === "generating";
  const showOutput = step.output != null;

  return (
    <div className="mx-auto max-w-5xl pb-20">
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

      {step.status !== "locked" && isGenerating && (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-border p-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Generating your personalised output…</span>
        </div>
      )}

      {showOutput && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <StepOutput
            stepType={step.type}
            output={step.output as Record<string, unknown>}
            stepId={step._id}
            journeyId={journeyId}
            targetRole={targetRole}
            marketInsightsSlot={
              isGapAnalysis && showJobListings ? (
                <div className="space-y-4">
                  <Suspense fallback={<ViewSkeleton />}>
                    <JobListings
                      journeyId={journeyId}
                      targetRole={targetRole!}
                      userLocation={userLocation!}
                      onJobSearchId={handleJobSearchId}
                      onJobsFetched={handleJobsFetched}
                    />
                  </Suspense>
                  {jobSearchId && targetRole && (
                    <Suspense fallback={<JobInsightsSkeleton />}>
                      <JobInsightsPanel
                        jobSearchId={jobSearchId}
                        targetRole={targetRole}
                      />
                    </Suspense>
                  )}
                </div>
              ) : undefined
            }
          />
        </div>
      )}

      {showJobListings && !isGapAnalysis && (
        <div className="mt-6 space-y-4">
          <Suspense fallback={<ViewSkeleton />}>
            <JobListings
              journeyId={journeyId}
              targetRole={targetRole!}
              userLocation={userLocation!}
              onJobSearchId={handleJobSearchId}
              onJobsFetched={handleJobsFetched}
            />
          </Suspense>
          {jobSearchId && targetRole && (
            <Suspense fallback={<JobInsightsSkeleton />}>
              <JobInsightsPanel
                jobSearchId={jobSearchId}
                targetRole={targetRole}
              />
            </Suspense>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
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

      <ChatAssistant systemPrompt={effectiveSystemPrompt} />
    </div>
  );
}

function JobInsightsSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">
          Market Insights
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

function JobInsightsPanel({
  jobSearchId,
  targetRole,
}: {
  jobSearchId: Id<"jobSearches">;
  targetRole: string;
}) {
  const insightsDoc = useSuspenseQuery(api.jobInsights.getBySearchId, { jobSearchId });
  const [open, setOpen] = useState(true);

  if (!insightsDoc) return null;

  const insights = insightsDoc.insights as unknown as JobInsights;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border bg-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Market Insights
              </h3>
            </div>
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border px-5 pb-5 pt-4">
            <JobInsightsCommentary
              insights={insights}
              targetRole={targetRole}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
