"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type GoalState =
  | "career_switch"
  | "promotion"
  | "new_job"
  | "new_direction"
  | "not_sure";

interface GoalStateProps {
  data: GoalState | null;
  onNext: (goal: GoalState) => void;
  onBack: () => void;
}

const goals: { value: GoalState; label: string; description: string }[] = [
  {
    value: "career_switch",
    label: "Switch careers entirely",
    description:
      "Move into a completely different field or industry from where you are now.",
  },
  {
    value: "promotion",
    label: "Get promoted",
    description:
      "Move up within your current organisation or a similar role elsewhere.",
  },
  {
    value: "new_job",
    label: "Find a new job",
    description:
      "Stay in your field but find a better role, team, or company.",
  },
  {
    value: "new_direction",
    label: "Explore a new direction",
    description:
      "Pivot into an adjacent area — same skills, different application.",
  },
  {
    value: "not_sure",
    label: "I'm not sure yet",
    description:
      "You know something needs to change but aren't certain what.",
  },
];

export function GoalState({ data, onNext, onBack }: GoalStateProps) {
  const [selected, setSelected] = useState<GoalState | null>(data);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          What are you aiming for?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the option that best describes your goal right now.
        </p>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => (
          <button
            key={goal.value}
            type="button"
            onClick={() => setSelected(goal.value)}
            className={`w-full rounded-lg border p-4 text-left transition-colors ${
              selected === goal.value
                ? "border-accent bg-accent/5 text-foreground"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <span className="block text-sm font-medium">{goal.label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {goal.description}
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="ghost">
          Back
        </Button>
        <Button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          variant="accent"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
