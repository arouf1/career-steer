import { Suspense } from "react";
import { RoadmapViewPage } from "@/components/views/roadmap-view-page";
import { QueryErrorBoundary } from "@/components/ui/query-error-boundary";
import { ViewSkeleton } from "@/components/ui/view-skeleton";
import type { Id } from "@/convex/_generated/dataModel";

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = await params;
  return (
    <QueryErrorBoundary>
      <Suspense fallback={<ViewSkeleton />}>
        <RoadmapViewPage journeyId={journeyId as Id<"journeys">} />
      </Suspense>
    </QueryErrorBoundary>
  );
}
