"use client";

import { Loader2 } from "lucide-react";

export function ProcessingScreen() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Analysing your career profile
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          We&apos;re reviewing your answers and building a personalised career
          analysis. This usually takes 15–30 seconds.
        </p>
      </div>
    </div>
  );
}
