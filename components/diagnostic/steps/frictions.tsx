"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FrictionsProps {
  data: string[];
  onNext: (frictions: string[]) => void;
  onBack: () => void;
}

const frictionOptions: { value: string; label: string }[] = [
  { value: "not_getting_interviews", label: "Not getting interviews" },
  { value: "unclear_path", label: "Unclear career path" },
  { value: "underqualified", label: "Feel underqualified" },
  { value: "low_confidence", label: "Low confidence" },
  { value: "burnout", label: "Burnout or exhaustion" },
  { value: "poor_manager", label: "Poor manager or culture" },
  { value: "unclear_positioning", label: "Unclear positioning" },
  { value: "no_network", label: "No professional network" },
  { value: "salary_stuck", label: "Salary feels stuck" },
  { value: "skills_outdated", label: "Skills feel outdated" },
];

export function Frictions({ data, onNext, onBack }: FrictionsProps) {
  const [selected, setSelected] = useState<string[]>(data);

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          What&apos;s holding you back?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select all that apply. This helps us understand your blockers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {frictionOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
              selected.includes(option.value)
                ? "border-accent bg-accent/5 text-foreground font-medium"
                : "border-border hover:border-muted-foreground/30 text-muted-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="ghost">
          Back
        </Button>
        <Button
          onClick={() => onNext(selected)}
          disabled={selected.length === 0}
          variant="accent"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
