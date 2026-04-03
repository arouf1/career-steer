import { CompleteView } from "@/components/views/complete-view";
import type { Id } from "@/convex/_generated/dataModel";

export default async function CompletePage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = await params;
  return <CompleteView journeyId={journeyId as Id<"journeys">} />;
}
