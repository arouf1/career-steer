"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { generateSalaryBands } from "@/app/actions/salary-bands";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { getLocationDisplay } from "@/lib/location";

interface Profile {
  currentRole: string;
  experienceLevel: "early" | "mid" | "senior";
  industry: string;
  salaryBand: string;
  location: string | { display: string; canonical: string };
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

const PREFER_NOT_TO_SAY = "Prefer not to say";
const CUSTOM_SALARY = "__custom__";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const selectClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none";

export function CurrentState({ data, onNext }: CurrentStateProps) {
  const [form, setForm] = useState<Partial<Profile>>({
    currentRole: data.currentRole ?? "",
    experienceLevel: data.experienceLevel,
    industry: data.industry ?? "",
    salaryBand: data.salaryBand ?? "",
    location: data.location ?? "",
    education: data.education ?? "",
  });

  const [salaryBands, setSalaryBands] = useState<string[]>([]);
  const [isFetchingBands, startFetchTransition] = useTransition();
  const [isCustomSalary, setIsCustomSalary] = useState(false);
  const lastFetchKey = useRef("");

  const locationDisplay = form.location
    ? getLocationDisplay(form.location)
    : "";

  const isComplete =
    form.currentRole &&
    form.experienceLevel &&
    form.industry &&
    form.salaryBand &&
    locationDisplay &&
    form.education;

  function fetchBands(role: string, location: string, level: string) {
    const key = `${role}|${location}|${level}`;
    if (key === lastFetchKey.current) return;
    lastFetchKey.current = key;

    startFetchTransition(async () => {
      try {
        const { bands } = await generateSalaryBands(role, location, level);
        setSalaryBands(bands);
      } catch {
        setSalaryBands([]);
      }
    });
  }

  function handleLocationSelect(loc: { display: string; canonical: string }) {
    setForm({ ...form, location: loc });
    const role = form.currentRole?.trim();
    const level = form.experienceLevel;
    if (role && level) {
      fetchBands(role, loc.display, level);
    }
  }

  function handleRoleBlur() {
    const role = form.currentRole?.trim();
    const level = form.experienceLevel;
    if (role && locationDisplay && level && salaryBands.length > 0) {
      fetchBands(role, locationDisplay, level);
    }
  }

  useEffect(() => {
    const role = data.currentRole?.trim();
    const loc = data.location ? getLocationDisplay(data.location) : "";
    const level = data.experienceLevel;
    if (role && loc && level) {
      fetchBands(role, loc, level);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit() {
    if (!isComplete) return;
    onNext(form as Profile);
  }

  const canFetchBands = !!(
    form.currentRole?.trim() && locationDisplay && form.experienceLevel
  );
  const showBandsDropdown = salaryBands.length > 0 || isFetchingBands;

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
            onBlur={handleRoleBlur}
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
                onClick={() => {
                  setForm({ ...form, experienceLevel: level.value });
                  const role = form.currentRole?.trim();
                  if (role && locationDisplay) {
                    fetchBands(role, locationDisplay, level.value);
                  }
                }}
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
            Location
          </label>
          <LocationAutocomplete
            value={locationDisplay}
            onSelect={handleLocationSelect}
            onDisplayChange={(display) =>
              setForm({ ...form, location: display })
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Salary band
          </label>
          {showBandsDropdown ? (
            <div className="space-y-2">
              <div className="relative">
                <select
                  className={selectClass}
                  value={
                    isCustomSalary
                      ? CUSTOM_SALARY
                      : form.salaryBand ?? ""
                  }
                  onChange={(e) => {
                    if (e.target.value === CUSTOM_SALARY) {
                      setIsCustomSalary(true);
                      setForm({ ...form, salaryBand: "" });
                    } else {
                      setIsCustomSalary(false);
                      setForm({ ...form, salaryBand: e.target.value });
                    }
                  }}
                  disabled={isFetchingBands}
                >
                  <option value="" disabled>
                    {isFetchingBands
                      ? "Loading salary bands…"
                      : "Select your salary band"}
                  </option>
                  {salaryBands.map((band) => (
                    <option key={band} value={band}>
                      {band}
                    </option>
                  ))}
                  <option value={CUSTOM_SALARY}>Enter custom amount</option>
                  <option value={PREFER_NOT_TO_SAY}>{PREFER_NOT_TO_SAY}</option>
                </select>
                {isFetchingBands && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {isCustomSalary && (
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. £55,000–£65,000"
                  value={form.salaryBand ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, salaryBand: e.target.value })
                  }
                  autoFocus
                />
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {canFetchBands
                ? "Select a location above to load options"
                : "Fill in your role, experience level, and location first"}
            </div>
          )}
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
