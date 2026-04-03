"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { CurrentState } from "./steps/current-state";
import { GoalState } from "./steps/goal-state";
import { Frictions } from "./steps/frictions";
import { Constraints } from "./steps/constraints";
import { Readiness } from "./steps/readiness";
import { ProcessingScreen } from "./processing-screen";

interface Profile {
  currentRole: string;
  experienceLevel: "early" | "mid" | "senior";
  industry: string;
  salaryBand: string;
  location: string;
  education: string;
}

interface FormData {
  profile: Partial<Profile>;
  goalState:
    | "career_switch"
    | "promotion"
    | "new_job"
    | "new_direction"
    | "not_sure"
    | null;
  frictions: string[];
  constraints: {
    hoursPerWeek: number;
    salaryFloor: number;
    urgency: "low" | "medium" | "high";
    willingnessToRetrain: boolean;
  };
  confidence: "low" | "medium" | "high" | null;
}

const STEP_LABELS = [
  "Your situation",
  "Your goal",
  "Blockers",
  "Constraints",
  "Readiness",
];

export function Questionnaire() {
  const router = useRouter();
  const saveDiagnostic = useMutation(api.diagnostics.saveDiagnostic);
  const generateAnalysis = useAction(api.diagnostics.generateAnalysis);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    profile: {},
    goalState: null,
    frictions: [],
    constraints: {
      hoursPerWeek: 5,
      salaryFloor: 30000,
      urgency: "medium",
      willingnessToRetrain: true,
    },
    confidence: null,
  });

  async function handleSubmit(confidence: "low" | "medium" | "high") {
    if (!formData.goalState || !formData.profile.currentRole) return;

    setIsSubmitting(true);
    try {
      const diagnosticId = await saveDiagnostic({
        profile: formData.profile as Profile,
        answers: {
          goalState: formData.goalState,
          frictions: formData.frictions,
          constraints: formData.constraints,
          confidence,
        },
      });

      await generateAnalysis({ diagnosticId });
      router.push("/diagnostic/results");
    } catch (error) {
      console.error("Failed to generate analysis:", error);
      setIsSubmitting(false);
    }
  }

  if (isSubmitting) {
    return <ProcessingScreen />;
  }

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {currentStep + 1} of {STEP_LABELS.length}
          </span>
          <span>{STEP_LABELS[currentStep]}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-accent transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / STEP_LABELS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {currentStep === 0 && (
        <CurrentState
          data={formData.profile}
          onNext={(profile) => {
            setFormData({ ...formData, profile });
            setCurrentStep(1);
          }}
        />
      )}

      {currentStep === 1 && (
        <GoalState
          data={formData.goalState}
          onNext={(goalState) => {
            setFormData({ ...formData, goalState });
            setCurrentStep(2);
          }}
          onBack={() => setCurrentStep(0)}
        />
      )}

      {currentStep === 2 && (
        <Frictions
          data={formData.frictions}
          onNext={(frictions) => {
            setFormData({ ...formData, frictions });
            setCurrentStep(3);
          }}
          onBack={() => setCurrentStep(1)}
        />
      )}

      {currentStep === 3 && (
        <Constraints
          data={formData.constraints}
          onNext={(constraints) => {
            setFormData({ ...formData, constraints });
            setCurrentStep(4);
          }}
          onBack={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 4 && (
        <Readiness
          data={formData.confidence}
          onSubmit={handleSubmit}
          onBack={() => setCurrentStep(3)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
