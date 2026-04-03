import { StepView } from "@/components/views/step-view";
import type { Id } from "@/convex/_generated/dataModel";

export default async function StepPage({
  params,
}: {
  params: Promise<{ journeyId: string; stepId: string }>;
}) {
  const { journeyId, stepId } = await params;
  return (
    <StepView
      journeyId={journeyId as Id<"journeys">}
      stepId={stepId as Id<"steps">}
    />
  );
}
