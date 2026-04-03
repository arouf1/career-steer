"use client";

interface ResultsSummaryProps {
  recommendedLane: string;
  feasibilityScore: number;
  summary: string;
  topStrengths: string[];
  keyBlockers: string[];
}

const LANE_LABELS: Record<string, string> = {
  career_switch: "Career Switch",
  promotion: "Promotion",
  job_search: "Job Search",
  career_clarity: "Career Clarity",
};

export function ResultsSummary({
  recommendedLane,
  feasibilityScore,
  summary,
  topStrengths,
  keyBlockers,
}: ResultsSummaryProps) {
  return (
    <div className="space-y-6 rounded-lg border border-border bg-background p-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recommended lane
          </span>
          <h3 className="mt-1 text-lg font-semibold text-foreground">
            {LANE_LABELS[recommendedLane] ?? recommendedLane}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Feasibility
          </span>
          <p className="mt-1 text-2xl font-bold text-accent">
            {feasibilityScore}
            <span className="text-sm font-normal text-muted-foreground">
              /100
            </span>
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-foreground">{summary}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-medium text-foreground">
            Your strengths
          </h4>
          <div className="flex flex-wrap gap-2">
            {topStrengths.map((strength) => (
              <span
                key={strength}
                className="rounded-full border border-[#16A34A]/30 bg-[#16A34A]/10 px-3 py-1 text-xs font-medium text-[#16A34A]"
              >
                {strength}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium text-foreground">
            Key blockers
          </h4>
          <div className="flex flex-wrap gap-2">
            {keyBlockers.map((blocker) => (
              <span
                key={blocker}
                className="rounded-full border border-[#D97706]/30 bg-[#D97706]/10 px-3 py-1 text-xs font-medium text-[#D97706]"
              >
                {blocker}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
