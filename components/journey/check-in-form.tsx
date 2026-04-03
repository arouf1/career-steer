"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

const BLOCKER_OPTIONS = [
  "Lack of time",
  "Low motivation",
  "Unclear next steps",
  "Skill gaps",
  "Waiting on others",
  "Financial constraints",
  "Imposter syndrome",
] as const;

interface CheckInFormProps {
  weekNumber: number;
  stepsCompleted: number;
  stepsTotal: number;
  isSubmitting: boolean;
  onSubmit: (reflection: string | null, blockers: string | null) => void;
}

export function CheckInForm({
  weekNumber,
  stepsCompleted,
  stepsTotal,
  isSubmitting,
  onSubmit,
}: CheckInFormProps) {
  const [reflection, setReflection] = useState("");
  const [selectedBlockers, setSelectedBlockers] = useState<string[]>([]);

  const completionRate =
    stepsTotal > 0 ? Math.round((stepsCompleted / stepsTotal) * 100) : 0;

  function toggleBlocker(blocker: string) {
    setSelectedBlockers((prev) =>
      prev.includes(blocker)
        ? prev.filter((b) => b !== blocker)
        : [...prev, blocker],
    );
  }

  function handleSubmit() {
    onSubmit(
      reflection.trim() || null,
      selectedBlockers.length > 0 ? selectedBlockers.join(", ") : null,
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold">Week {weekNumber} progress</h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {stepsCompleted}/{stepsTotal}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-success" />
          {completionRate}% of this week&apos;s steps done
        </div>
      </div>

      <div className="rounded-xl border border-border p-6">
        <label
          htmlFor="reflection"
          className="block text-sm font-semibold"
        >
          How did this week go?{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="reflection"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Share anything — wins, struggles, or what you learnt this week…"
          rows={4}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      <div className="rounded-xl border border-border p-6">
        <p className="text-sm font-semibold">
          Any blockers?{" "}
          <span className="font-normal text-muted-foreground">
            (select all that apply)
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {BLOCKER_OPTIONS.map((blocker) => {
            const isSelected = selectedBlockers.includes(blocker);
            return (
              <button
                key={blocker}
                type="button"
                onClick={() => toggleBlocker(blocker)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  isSelected
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:border-accent/40"
                }`}
              >
                {blocker}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        variant="accent"
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating your check-in…
          </>
        ) : (
          "Complete check-in"
        )}
      </Button>
    </div>
  );
}
