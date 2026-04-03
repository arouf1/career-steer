"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Confidence = "low" | "medium" | "high";

interface ReadinessProps {
  data: Confidence | null;
  onSubmit: (confidence: Confidence) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const confidenceLevels: {
  value: Confidence;
  label: string;
  description: string;
}[] = [
  {
    value: "low",
    label: "Not very confident",
    description:
      "I feel quite uncertain about what I want or how to get there.",
  },
  {
    value: "medium",
    label: "Somewhat confident",
    description:
      "I have a rough idea but could use guidance on the specifics.",
  },
  {
    value: "high",
    label: "Quite confident",
    description:
      "I know what I want — I just need a plan to make it happen.",
  },
];

export function Readiness({
  data,
  onSubmit,
  onBack,
  isSubmitting,
}: ReadinessProps) {
  const [selected, setSelected] = useState<Confidence | null>(data);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          How ready do you feel?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          There&apos;s no wrong answer — this helps us calibrate the advice.
        </p>
      </div>

      <div className="space-y-3">
        {confidenceLevels.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => setSelected(level.value)}
            className={`w-full rounded-lg border p-4 text-left transition-colors ${
              selected === level.value
                ? "border-accent bg-accent/5 text-foreground"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <span className="block text-sm font-medium">{level.label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {level.description}
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="ghost" disabled={isSubmitting}>
          Back
        </Button>
        <Button
          onClick={() => selected && onSubmit(selected)}
          disabled={!selected || isSubmitting}
          variant="accent"
        >
          {isSubmitting ? "Analysing…" : "Get my analysis"}
        </Button>
      </div>
    </div>
  );
}
