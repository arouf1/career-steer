"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ConstraintsData {
  hoursPerWeek: number;
  salaryFloor: number;
  urgency: "low" | "medium" | "high";
  willingnessToRetrain: boolean;
}

interface ConstraintsProps {
  data: Partial<ConstraintsData>;
  onNext: (constraints: ConstraintsData) => void;
  onBack: () => void;
}

const urgencyOptions: {
  value: "low" | "medium" | "high";
  label: string;
  description: string;
}[] = [
  {
    value: "low",
    label: "Low",
    description: "No rush — happy to take my time",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Want progress in the next few months",
  },
  {
    value: "high",
    label: "High",
    description: "Need to move quickly",
  },
];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function Constraints({ data, onNext, onBack }: ConstraintsProps) {
  const [form, setForm] = useState<ConstraintsData>({
    hoursPerWeek: data.hoursPerWeek ?? 5,
    salaryFloor: data.salaryFloor ?? 30000,
    urgency: data.urgency ?? "medium",
    willingnessToRetrain: data.willingnessToRetrain ?? true,
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Your constraints
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Help us understand what&apos;s realistic for you right now.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Hours per week you can invest:{" "}
            <span className="font-semibold text-accent">
              {form.hoursPerWeek}h
            </span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={form.hoursPerWeek}
            onChange={(e) =>
              setForm({ ...form, hoursPerWeek: Number(e.target.value) })
            }
            className="w-full accent-[#4F46E5]"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>1 hour</span>
            <span>20 hours</span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Minimum acceptable salary (£)
          </label>
          <input
            type="number"
            className={inputClass}
            value={form.salaryFloor}
            onChange={(e) =>
              setForm({ ...form, salaryFloor: Number(e.target.value) })
            }
            step={1000}
            min={0}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            How urgently do you need a change?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {urgencyOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm({ ...form, urgency: option.value })}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  form.urgency === option.value
                    ? "border-accent bg-accent/5 text-foreground"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Are you willing to retrain or study?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ].map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() =>
                  setForm({ ...form, willingnessToRetrain: option.value })
                }
                className={`rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  form.willingnessToRetrain === option.value
                    ? "border-accent bg-accent/5 text-foreground font-medium"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="ghost">
          Back
        </Button>
        <Button onClick={() => onNext(form)} variant="accent">
          Continue
        </Button>
      </div>
    </div>
  );
}
