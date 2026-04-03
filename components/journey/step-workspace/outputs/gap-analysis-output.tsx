"use client";

import type { GapAnalysisOutput } from "@/lib/ai/schemas";

interface GapAnalysisOutputProps {
  output: GapAnalysisOutput;
}

const levelColours: Record<string, string> = {
  none: "bg-danger/10 text-danger",
  beginner: "bg-warning/10 text-warning",
  intermediate: "bg-accent/10 text-accent",
  advanced: "bg-success/10 text-success",
  expert: "bg-success/20 text-success",
};

const priorityStyles: Record<string, string> = {
  high: "bg-danger/10 text-danger",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

export function GapAnalysisOutputDisplay({ output }: GapAnalysisOutputProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-xl border border-border p-5">
        <div className="relative h-16 w-16">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              className="text-muted"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              className="text-accent"
              strokeWidth="3"
              strokeDasharray={`${output.overallReadiness}, 100`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {output.overallReadiness}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Overall Readiness</h3>
          <p className="text-sm text-muted-foreground">
            {output.overallReadiness >= 70
              ? "You're well positioned for this transition."
              : output.overallReadiness >= 40
                ? "Some gaps to address, but a strong foundation."
                : "Significant development needed — but that's okay."}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Skills Assessment</h3>
        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Skill</th>
                <th className="px-4 py-2 text-left font-medium">Current</th>
                <th className="px-4 py-2 text-left font-medium">Required</th>
                <th className="px-4 py-2 text-left font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {output.skills.map((skill, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">{skill.name}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${levelColours[skill.currentLevel]}`}
                    >
                      {skill.currentLevel}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${levelColours[skill.requiredLevel]}`}
                    >
                      {skill.requiredLevel}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${priorityStyles[skill.priority]}`}
                    >
                      {skill.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {output.quickWins.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Quick Wins</h3>
          <ul className="mt-2 space-y-2">
            {output.quickWins.map((win, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                <span className="text-muted-foreground">{win}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {output.longerTermGaps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Longer-term Gaps</h3>
          <ul className="mt-2 space-y-2">
            {output.longerTermGaps.map((gap, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                <span className="text-muted-foreground">{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {output.suggestedResources.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Suggested Resources</h3>
          <div className="mt-2 space-y-2">
            {output.suggestedResources.map((res, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-medium capitalize text-accent">
                  {res.type}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{res.resource}</p>
                  <p className="text-xs text-muted-foreground">
                    For: {res.skill}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
