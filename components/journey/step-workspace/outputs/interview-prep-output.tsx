"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { InterviewPrepOutput } from "@/lib/ai/schemas";

interface InterviewPrepOutputProps {
  output: InterviewPrepOutput;
}

const categoryStyles: Record<string, string> = {
  behavioural: "bg-accent/10 text-accent",
  technical: "bg-success/10 text-success",
  situational: "bg-warning/10 text-warning",
  "role-specific": "bg-danger/10 text-danger",
};

function QuestionCard({
  question,
}: {
  question: InterviewPrepOutput["questions"][number];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize ${categoryStyles[question.category] ?? "bg-muted text-muted-foreground"}`}
            >
              {question.category}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium">{question.question}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Why they ask this
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {question.whyTheyAsk}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Model answer
            </h4>
            <p className="mt-1 rounded-lg bg-muted/30 p-3 text-sm leading-relaxed">
              {question.modelAnswer}
            </p>
          </div>

          {question.tips.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tips
              </h4>
              <ul className="mt-1 space-y-1">
                {question.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InterviewPrepOutputDisplay({
  output,
}: InterviewPrepOutputProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        Interview Questions ({output.questions.length})
      </h3>
      {output.questions.map((question, i) => (
        <QuestionCard key={i} question={question} />
      ))}
    </div>
  );
}
