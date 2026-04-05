import { Suspense } from "react";
import { StepView } from "@/components/views/step-view";
import { QueryErrorBoundary } from "@/components/ui/query-error-boundary";
import { ViewSkeleton } from "@/components/ui/view-skeleton";
import type { Id } from "@/convex/_generated/dataModel";

export default async function StepPage({
  params,
}: {
  params: Promise<{ journeyId: string; stepId: string }>;
}) {
  const { journeyId, stepId } = await params;
  return (
    <QueryErrorBoundary>
      <Suspense fallback={<ViewSkeleton />}>
        <StepView
          journeyId={journeyId as Id<"journeys">}
          stepId={stepId as Id<"steps">}
        />
      </Suspense>
    </QueryErrorBoundary>
  );
}
