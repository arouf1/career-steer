import { Suspense } from "react";
import { CompleteView } from "@/components/views/complete-view";
import { QueryErrorBoundary } from "@/components/ui/query-error-boundary";
import { ViewSkeleton } from "@/components/ui/view-skeleton";
import type { Id } from "@/convex/_generated/dataModel";

export default async function CompletePage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = await params;
  return (
    <QueryErrorBoundary>
      <Suspense fallback={<ViewSkeleton />}>
        <CompleteView journeyId={journeyId as Id<"journeys">} />
      </Suspense>
    </QueryErrorBoundary>
  );
}
