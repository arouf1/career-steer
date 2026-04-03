import { RoadmapViewPage } from "@/components/views/roadmap-view-page";
import type { Id } from "@/convex/_generated/dataModel";

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = await params;
  return <RoadmapViewPage journeyId={journeyId as Id<"journeys">} />;
}
