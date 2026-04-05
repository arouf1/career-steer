"use client";

import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ReactNode } from "react";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message =
    error instanceof Error
      ? error.message
      : "An unexpected error occurred. Please try again.";

  return (
    <div className="flex items-center justify-center py-20">
      <div className="mx-auto max-w-md rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
        <h2 className="mt-3 text-lg font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <Button
          onClick={resetErrorBoundary}
          variant="secondary"
          size="sm"
          className="mt-4"
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    </div>
  );
}

export function QueryErrorBoundary({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>
    </div>
  );
}
