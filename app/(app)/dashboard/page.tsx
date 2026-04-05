import { Suspense } from "react";
import { DashboardView } from "@/components/views/dashboard-view";
import { QueryErrorBoundary } from "@/components/ui/query-error-boundary";
import { ViewSkeleton } from "@/components/ui/view-skeleton";

export default function DashboardPage() {
  return (
    <QueryErrorBoundary>
      <Suspense fallback={<ViewSkeleton />}>
        <DashboardView />
      </Suspense>
    </QueryErrorBoundary>
  );
}
