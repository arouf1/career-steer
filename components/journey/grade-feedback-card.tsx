import type { EntryGrade } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";
import { Lightbulb, TrendingUp } from "lucide-react";

const GRADE_COLOURS: Record<string, string> = {
  "A+": "bg-success/15 text-success border-success/30",
  A: "bg-success/15 text-success border-success/30",
  "A-": "bg-success/10 text-success border-success/20",
  "B+": "bg-accent/15 text-accent border-accent/30",
  B: "bg-accent/10 text-accent border-accent/20",
  "B-": "bg-accent/10 text-accent border-accent/20",
  "C+": "bg-warning/15 text-warning border-warning/30",
  C: "bg-warning/10 text-warning border-warning/20",
  D: "bg-danger/15 text-danger border-danger/30",
  F: "bg-danger/15 text-danger border-danger/30",
};

type GradeTier = "success" | "accent" | "warning" | "danger";

const LETTER_TIER: Record<EntryGrade["letter"], GradeTier> = {
  "A+": "success",
  A: "success",
  "A-": "success",
  "B+": "accent",
  B: "accent",
  "B-": "accent",
  "C+": "warning",
  C: "warning",
  D: "danger",
  F: "danger",
};

const HERO: Record<
  GradeTier,
  {
    box: string;
    mainClass: string;
    suffixClass: string;
    bar: string;
  }
> = {
  success: {
    box: "border-success/35 bg-gradient-to-br from-success/10 to-success/20 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.04)]",
    mainClass: "text-success",
    suffixClass: "text-success/85",
    bar: "from-success via-emerald-500 to-teal-500",
  },
  accent: {
    box: "border-accent/35 bg-gradient-to-br from-accent/10 to-accent/18 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.04)]",
    mainClass: "text-accent",
    suffixClass: "text-accent/85",
    bar: "from-accent via-indigo-500 to-violet-500",
  },
  warning: {
    box: "border-warning/35 bg-gradient-to-br from-warning/10 to-warning/18 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.04)]",
    mainClass: "text-warning",
    suffixClass: "text-warning/85",
    bar: "from-warning via-amber-400 to-orange-400",
  },
  danger: {
    box: "border-danger/35 bg-gradient-to-br from-danger/10 to-danger/18 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.04)]",
    mainClass: "text-danger",
    suffixClass: "text-danger/85",
    bar: "from-danger via-red-500 to-rose-500",
  },
};

function splitGradeLetter(letter: string): { main: string; suffix: string | null } {
  const last = letter[letter.length - 1];
  if (last === "+" || last === "-") {
    return { main: letter.slice(0, -1), suffix: last };
  }
  return { main: letter, suffix: null };
}

function GradeHero({ letter }: { letter: EntryGrade["letter"] }) {
  const tier = LETTER_TIER[letter];
  const h = HERO[tier];
  const { main, suffix } = splitGradeLetter(letter);

  return (
    <div className="relative shrink-0 cursor-default">
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-lg border sm:h-[4.5rem] sm:w-[4.5rem] sm:rounded-xl",
          h.box,
        )}
      >
        <span className="flex items-baseline font-bold leading-none tracking-tight">
          <span className={cn("text-3xl sm:text-4xl", h.mainClass)}>{main}</span>
          {suffix ? (
            <span
              className={cn(
                "ml-px text-xl font-semibold sm:text-2xl",
                h.suffixClass,
              )}
            >
              {suffix}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

/** Compact pill for tabs and inline labels. */
export function GradeBadge({ letter }: { letter: string }) {
  const colours =
    GRADE_COLOURS[letter] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-bold",
        colours,
      )}
    >
      {letter}
    </span>
  );
}

export function GradeFeedback({ grade }: { grade: EntryGrade }) {
  const tier = LETTER_TIER[grade.letter];
  const bar = HERO[tier].bar;

  return (
    <article
      className={cn(
        "mt-3 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_4px_24px_-6px_rgba(0,0,0,0.06),0_1px_4px_-2px_rgba(0,0,0,0.03)]",
      )}
    >
      <div
        className={cn(
          "h-1 w-full bg-gradient-to-r opacity-90",
          bar,
        )}
      />

      <header className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
        <GradeHero letter={grade.letter} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-normal leading-relaxed text-muted-foreground">
            {grade.summary}
          </p>
        </div>
      </header>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-80" />

      <div className="grid grid-cols-1 gap-4 bg-muted/20 p-6 sm:grid-cols-2 sm:gap-5 sm:p-8 sm:pt-6">
        {grade.strengths.length > 0 ? (
          <section className="rounded-2xl border border-success/20 bg-success/5 p-5">
            <h3 className="mb-3.5 flex items-center gap-2 text-sm font-bold text-success">
              <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
              Strengths
            </h3>
            <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              {grade.strengths.map((s, i) => (
                <li key={i} className="relative pl-4">
                  <span
                    className="absolute left-0 top-2 h-1 w-1 rounded-full bg-success"
                    aria-hidden
                  />
                  {s}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {grade.improvements.length > 0 ? (
          <section className="rounded-2xl border border-warning/25 bg-warning/5 p-5">
            <h3 className="mb-3.5 flex items-center gap-2 text-sm font-bold text-warning">
              <Lightbulb className="h-4 w-4 shrink-0" aria-hidden />
              Tips to improve
            </h3>
            <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              {grade.improvements.map((tip, i) => (
                <li key={i} className="relative pl-4">
                  <span
                    className="absolute left-0 top-2 h-1 w-1 rounded-full bg-warning"
                    aria-hidden
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
