"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="mx-auto max-w-md rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-4 text-xl font-bold text-foreground">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again or return to the
          dashboard.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset} variant="secondary" size="sm">
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Try again
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
