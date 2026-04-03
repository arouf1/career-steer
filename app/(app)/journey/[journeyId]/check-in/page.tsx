import { CheckInView } from "@/components/views/check-in-view";
import type { Id } from "@/convex/_generated/dataModel";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const { journeyId } = await params;
  return <CheckInView journeyId={journeyId as Id<"journeys">} />;
}
