import { Suspense } from "react";
import { CheckInView } from "@/components/views/check-in-view";
import { QueryErrorBoundary } from "@/components/ui/query-error-boundary";
import { ViewSkeleton } from "@/components/ui/view-skeleton";
import type { Id } from "@/convex/_generated/dataModel";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = await params;
  return (
    <QueryErrorBoundary>
      <Suspense fallback={<ViewSkeleton />}>
        <CheckInView journeyId={journeyId as Id<"journeys">} />
      </Suspense>
    </QueryErrorBoundary>
  );
}
