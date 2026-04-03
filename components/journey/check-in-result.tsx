"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

interface CheckInResultProps {
  encouragement: string;
  recommendations: string[];
}

export function CheckInResult({
  encouragement,
  recommendations,
}: CheckInResultProps) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <h2 className="text-sm font-semibold text-accent">
              Your weekly encouragement
            </h2>
            <p className="mt-2 text-sm leading-relaxed">{encouragement}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold">
          Recommendations for next week
        </h2>
        <ol className="mt-4 space-y-3">
          {recommendations.map((rec, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                {i + 1}
              </span>
              <span className="leading-relaxed">{rec}</span>
            </li>
          ))}
        </ol>
      </div>

      <Link href="/dashboard">
        <Button variant="accent" size="lg" className="w-full">
          Continue to next week
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
