"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Profile {
  currentRole: string;
  experienceLevel: "early" | "mid" | "senior";
  industry: string;
  salaryBand: string;
  location: string;
  education: string;
}

interface CurrentStateProps {
  data: Partial<Profile>;
  onNext: (data: Profile) => void;
}

const experienceLevels = [
  { value: "early" as const, label: "Early career", description: "0–3 years" },
  { value: "mid" as const, label: "Mid-level", description: "3–8 years" },
  { value: "senior" as const, label: "Senior", description: "8+ years" },
];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function CurrentState({ data, onNext }: CurrentStateProps) {
  const [form, setForm] = useState<Partial<Profile>>({
    currentRole: data.currentRole ?? "",
    experienceLevel: data.experienceLevel,
    industry: data.industry ?? "",
    salaryBand: data.salaryBand ?? "",
    location: data.location ?? "",
    education: data.education ?? "",
  });

  const isComplete =
    form.currentRole &&
    form.experienceLevel &&
    form.industry &&
    form.salaryBand &&
    form.location &&
    form.education;

  function handleSubmit() {
    if (!isComplete) return;
    onNext(form as Profile);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Where are you now?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your current situation so we can give relevant advice.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Current role
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Marketing Manager"
            value={form.currentRole ?? ""}
            onChange={(e) => setForm({ ...form, currentRole: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Experience level
          </label>
          <div className="grid grid-cols-3 gap-3">
            {experienceLevels.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() =>
                  setForm({ ...form, experienceLevel: level.value })
                }
                className={`rounded-lg border p-3 text-left transition-colors ${
                  form.experienceLevel === level.value
                    ? "border-accent bg-accent/5 text-foreground"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <span className="block text-sm font-medium">
                  {level.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {level.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Industry
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Financial Services"
            value={form.industry ?? ""}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Salary band
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. £40,000–£50,000"
            value={form.salaryBand ?? ""}
            onChange={(e) => setForm({ ...form, salaryBand: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Location
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. London, UK"
            value={form.location ?? ""}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Education
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. BSc Computer Science"
            value={form.education ?? ""}
            onChange={(e) => setForm({ ...form, education: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!isComplete} variant="accent">
          Continue
        </Button>
      </div>
    </div>
  );
}
