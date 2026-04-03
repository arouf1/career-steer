"use client";

import type { CvRewriteOutput } from "@/lib/ai/schemas";

interface CvRewriteOutputProps {
  output: CvRewriteOutput;
}

export function CvRewriteOutputDisplay({ output }: CvRewriteOutputProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Professional Summary</h3>
        <p className="mt-2 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed">
          {output.professionalSummary}
        </p>
      </div>

      {output.sections.map((section, i) => (
        <div key={i}>
          <h3 className="text-lg font-semibold">{section.heading}</h3>
          <div className="mt-2 space-y-3">
            {section.items.map((item, j) => (
              <div
                key={j}
                className="rounded-lg border border-border p-4"
              >
                <h4 className="font-medium">{item.title}</h4>
                <ul className="mt-2 space-y-1">
                  {item.bullets.map((bullet, k) => (
                    <li
                      key={k}
                      className="flex gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}

      {output.keywords.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Keywords</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {output.keywords.map((keyword, i) => (
              <span
                key={i}
                className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {output.tailoringNotes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Tailoring Notes</h3>
          <ul className="mt-2 space-y-2">
            {output.tailoringNotes.map((note, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
