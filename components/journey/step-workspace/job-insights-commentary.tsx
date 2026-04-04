"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  Lightbulb,
  PoundSterling,
  Target,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { JobInsights } from "@/lib/ai/schemas";

interface JobInsightsCommentaryProps {
  insights: JobInsights;
  targetRole: string;
}

const GAP_ICON: Record<string, typeof CheckCircle2> = {
  strong: CheckCircle2,
  partial: AlertTriangle,
  gap: Target,
  unknown: Lightbulb,
};

const GAP_COLOUR: Record<string, string> = {
  strong: "text-success",
  partial: "text-warning",
  gap: "text-danger",
  unknown: "text-muted-foreground",
};

const BAR_BG: Record<string, string> = {
  strong: "bg-success",
  partial: "bg-warning",
  gap: "bg-danger",
  unknown: "bg-muted-foreground",
};

const IMPORTANCE_LABEL: Record<string, string> = {
  critical: "Critical",
  important: "Important",
  nice_to_have: "Nice to have",
};

const IMPORTANCE_VARIANT: Record<string, "default" | "secondary" | "outline"> =
  {
    critical: "default",
    important: "secondary",
    nice_to_have: "outline",
  };

function isValidSalary(val: string | undefined): val is string {
  return !!val && val !== "null" && val.toLowerCase() !== "not stated";
}

export function JobInsightsCommentary({
  insights,
  targetRole,
}: JobInsightsCommentaryProps) {
  const {
    skillDemand,
    salaryAnalysis,
    industryClusters,
    gapAlignment,
    keyPatterns,
    overallNarrative,
  } = insights;

  const sortedSkills = useMemo(
    () =>
      [...skillDemand]
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 8),
    [skillDemand],
  );

  const gapMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of gapAlignment) {
      m.set(g.skill.toLowerCase(), g.userLevel);
    }
    return m;
  }, [gapAlignment]);

  const sortedGaps = useMemo(
    () => [...gapAlignment].sort((a, b) => b.marketDemand - a.marketDemand),
    [gapAlignment],
  );

  const hasAnySalary =
    isValidSalary(salaryAnalysis.lowestSeen) ||
    isValidSalary(salaryAnalysis.highestSeen) ||
    isValidSalary(salaryAnalysis.mostCommonRange);

  return (
    <div className="space-y-5">
      {/* 1. Salary Landscape */}
      {(hasAnySalary || salaryAnalysis.commentary) && (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">
              Salary Landscape
            </h4>
          </div>
          {hasAnySalary && (
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              {isValidSalary(salaryAnalysis.lowestSeen) && (
                <div>
                  <span className="block text-xs text-muted-foreground">
                    Lowest
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-foreground">
                    {salaryAnalysis.lowestSeen}
                  </span>
                </div>
              )}
              {isValidSalary(salaryAnalysis.mostCommonRange) && (
                <div>
                  <span className="block text-xs text-muted-foreground">
                    Typical
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-accent">
                    {salaryAnalysis.mostCommonRange}
                  </span>
                </div>
              )}
              {isValidSalary(salaryAnalysis.highestSeen) && (
                <div>
                  <span className="block text-xs text-muted-foreground">
                    Highest
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-foreground">
                    {salaryAnalysis.highestSeen}
                  </span>
                </div>
              )}
            </div>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {salaryAnalysis.commentary}
          </p>
        </div>
      )}

      {/* 2. Skill Demand */}
      {sortedSkills.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">
              Most In-Demand Skills
            </h4>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              Strong
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-warning" />
              Partial
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-danger" />
              Gap
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
              Not assessed
            </span>
          </div>
          <div className="mt-3 space-y-2.5">
            {sortedSkills.map((skill) => {
              const maxJobs = sortedSkills[0]?.totalJobs || 1;
              const pct = Math.round((skill.frequency / maxJobs) * 100);
              const level =
                gapMap.get(skill.skill.toLowerCase()) ?? "unknown";
              const barClass = BAR_BG[level] ?? "bg-muted-foreground";

              return (
                <div key={skill.skill}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-foreground">
                      {skill.skill}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {skill.frequency}/{skill.totalJobs}
                      </span>
                      <Badge
                        variant={
                          IMPORTANCE_VARIANT[skill.importance] ?? "outline"
                        }
                        className="h-4 px-1.5 text-[9px]"
                      >
                        {IMPORTANCE_LABEL[skill.importance] ?? skill.importance}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${barClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Your Skills vs Market Demand */}
      {sortedGaps.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">
              Your Skills vs Market Demand
            </h4>
          </div>
          <div className="mt-3 space-y-3">
            {sortedGaps.map((gap) => {
              const Icon = GAP_ICON[gap.userLevel] ?? Lightbulb;
              return (
                <div key={gap.skill} className="flex items-start gap-2">
                  <Icon
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${GAP_COLOUR[gap.userLevel] ?? "text-muted-foreground"}`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {gap.skill}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {gap.marketDemand} posting
                        {gap.marketDemand !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {gap.commentary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Industry Clusters */}
      {industryClusters.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">
              Industry Clusters
            </h4>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {industryClusters.map((cluster) => (
              <div
                key={cluster.category}
                className="rounded-md border border-border bg-muted/30 p-3"
              >
                <span className="text-xs font-semibold text-foreground">
                  {cluster.category}
                </span>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {cluster.companies.join(", ")}
                </p>
                {cluster.typicalRequirements.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cluster.typicalRequirements.slice(0, 3).map((req) => (
                      <Badge
                        key={req}
                        variant="outline"
                        className="h-4 px-1.5 text-[9px]"
                      >
                        {req}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Key Patterns */}
      {keyPatterns.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">
              Key Patterns
            </h4>
          </div>
          <ul className="mt-3 space-y-2">
            {keyPatterns.map((pattern, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                <span className="leading-relaxed text-muted-foreground">
                  {pattern}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Market Summary */}
      {overallNarrative && (
        <div className="rounded-lg border border-border p-4">
          <h4 className="text-sm font-semibold text-foreground">
            Market Summary
          </h4>
          <div className="mt-2 space-y-2">
            {overallNarrative.split("\n\n").map((para, i) => (
              <p
                key={i}
                className="text-xs leading-relaxed text-muted-foreground"
              >
                {para}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
