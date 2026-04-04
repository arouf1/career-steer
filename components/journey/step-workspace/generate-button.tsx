"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface GenerateButtonProps {
  stepId: Id<"steps">;
  generationStatus: "idle" | "generating" | "completed" | "failed";
}

export function GenerateButton({
  stepId,
  generationStatus,
}: GenerateButtonProps) {
  const generateStepOutput = useAction(api.steps.generateStepOutput);
  const [isTriggering, setIsTriggering] = useState(false);

  const handleGenerate = async () => {
    setIsTriggering(true);
    try {
      await generateStepOutput({ stepId });
    } catch {
      // generationStatus will reflect the failure
    } finally {
      setIsTriggering(false);
    }
  };

  if (
    generationStatus === "idle" ||
    generationStatus === "generating" ||
    isTriggering
  ) {
    return null;
  }

  if (generationStatus === "failed") {
    return (
      <Button variant="accent" onClick={handleGenerate}>
        <AlertTriangle className="mr-2 h-4 w-4" />
        Try again
      </Button>
    );
  }

  return (
    <Button variant="secondary" onClick={handleGenerate}>
      <RefreshCw className="mr-2 h-4 w-4" />
      Regenerate
    </Button>
  );
}
