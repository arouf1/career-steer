import { Suspense } from "react";
import { DiagnosticResultsView } from "@/components/views/diagnostic-results-view";
import { QueryErrorBoundary } from "@/components/ui/query-error-boundary";
import { ViewSkeleton } from "@/components/ui/view-skeleton";

export default function DiagnosticResultsPage() {
  return (
    <QueryErrorBoundary>
      <Suspense fallback={<ViewSkeleton />}>
        <DiagnosticResultsView />
      </Suspense>
    </QueryErrorBoundary>
  );
}
