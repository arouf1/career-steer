"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FrictionsProps {
  data: string[];
  onNext: (frictions: string[]) => void;
  onBack: () => void;
}

const frictionOptions: { value: string; label: string; example: string }[] = [
  {
    value: "not_getting_interviews",
    label: "Not getting interviews",
    example: "e.g. you apply but rarely hear back, or you get screened out early.",
  },
  {
    value: "unclear_path",
    label: "Unclear career path",
    example: "e.g. you're unsure whether to stay, pivot, or what the next step is.",
  },
  {
    value: "underqualified",
    label: "Feel underqualified",
    example: "e.g. job ads list skills or seniority you don't think you have yet.",
  },
  {
    value: "low_confidence",
    label: "Low confidence",
    example: "e.g. you downplay your experience or freeze when pitching yourself.",
  },
  {
    value: "burnout",
    label: "Burnout or exhaustion",
    example: "e.g. you're drained after work and struggle to plan or upskill.",
  },
  {
    value: "poor_manager",
    label: "Poor manager or culture",
    example: "e.g. micromanagement, lack of support, or a toxic team environment.",
  },
  {
    value: "unclear_positioning",
    label: "Unclear positioning",
    example: "e.g. others don't grasp what you do or why you're a strong hire.",
  },
  {
    value: "no_network",
    label: "No professional network",
    example: "e.g. few people to ask for referrals, intros, or honest feedback.",
  },
  {
    value: "salary_stuck",
    label: "Salary feels stuck",
    example: "e.g. your pay hasn't moved with the market or your responsibilities.",
  },
  {
    value: "skills_outdated",
    label: "Skills feel outdated",
    example: "e.g. your day-to-day tools don't match what employers are asking for.",
  },
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {frictionOptions.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                isSelected
                  ? "border-accent bg-accent/5 text-foreground"
                  : "border-border hover:border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              <span
                className={`block ${isSelected ? "font-medium text-foreground" : "font-medium"}`}
              >
                {option.label}
              </span>
              <span
                className={`mt-1 block text-xs leading-snug ${
                  isSelected ? "text-muted-foreground" : "text-muted-foreground/90"
                }`}
              >
                {option.example}
              </span>
            </button>
          );
        })}
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
