"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultsSummary } from "@/components/diagnostic/results-summary";
import { CareerPathMap } from "@/components/diagnostic/career-path-map";

export default function DiagnosticResultsPage() {
  const router = useRouter();
  const diagnostic = useQuery(api.diagnostics.getLatestForUser);
  const user = useQuery(api.users.getCurrentUser);
  const createJourney = useMutation(api.journeys.create);

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (diagnostic === undefined || user === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!diagnostic || !diagnostic.analysis) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          No results yet
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete the diagnostic questionnaire to see your career analysis.
        </p>
        <Button
          onClick={() => router.push("/diagnostic")}
          variant="accent"
          className="mt-4"
        >
          Start diagnostic
        </Button>
      </div>
    );
  }

  const { analysis } = diagnostic;

  async function handleStartJourney() {
    if (!diagnostic || !diagnostic.analysis) return;
    setIsCreating(true);
    try {
      const journeyId = await createJourney({
        diagnosticId: diagnostic._id,
        lane: diagnostic.analysis.recommendedLane,
        targetRole: selectedRole,
      });
      router.push(`/journey/${journeyId}/roadmap`);
    } catch (error) {
      console.error("Failed to create journey:", error);
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Your results</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what we found based on your diagnostic answers.
        </p>
      </div>

      <ResultsSummary
        recommendedLane={analysis.recommendedLane}
        feasibilityScore={analysis.feasibilityScore}
        summary={analysis.summary}
        topStrengths={analysis.topStrengths}
        keyBlockers={analysis.keyBlockers}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Career Path Map
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Select a target role to start your journey. Green lines show
          strengths, amber shows partial skills, and red dashed lines show gaps
          to address.
        </p>
        <CareerPathMap
          currentRole={user?.profile?.currentRole ?? "Current role"}
          pathMapData={analysis.pathMapData}
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
        />
      </div>

      {selectedRole && (
        <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Selected target: <span className="text-accent">{selectedRole}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              We&apos;ll build a personalised roadmap for this role.
            </p>
          </div>
          <Button
            onClick={handleStartJourney}
            disabled={isCreating}
            variant="accent"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Start this journey"
            )}
          </Button>
        </div>
      )}

      {!selectedRole && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Click on a target role in the map above to begin your journey.
          </p>
        </div>
      )}
    </div>
  );
}
