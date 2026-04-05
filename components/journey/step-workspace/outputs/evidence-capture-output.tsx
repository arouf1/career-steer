"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { useSuspenseQuery } from "@/hooks/use-suspense-query";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { EvidenceCaptureOutput, EntryGrade } from "@/lib/ai/schemas";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  TrendingUp,
  Lightbulb,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const SAVE_DEBOUNCE_MS = 800;
const GRADE_DEBOUNCE_MS = 2000;
const GRADE_MIN_LENGTH = 50;

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

function GradeBadge({ letter }: { letter: string }) {
  const colours = GRADE_COLOURS[letter] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-bold ${colours}`}
    >
      {letter}
    </span>
  );
}

function GradeFeedback({ grade }: { grade: EntryGrade }) {
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <GradeBadge letter={grade.letter} />
        <p className="text-sm text-muted-foreground">{grade.summary}</p>
      </div>

      {grade.strengths.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-success" />
            <h5 className="text-xs font-semibold text-success">Strengths</h5>
          </div>
          <ul className="mt-1 space-y-0.5">
            {grade.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {grade.improvements.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-3 w-3 text-warning" />
            <h5 className="text-xs font-semibold text-warning">
              Tips to improve
            </h5>
          </div>
          <ul className="mt-1 space-y-0.5">
            {grade.improvements.map((tip, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface TaskPanelProps {
  task: EvidenceCaptureOutput["tasks"][number];
  taskIndex: number;
  stepId: Id<"steps">;
  journeyId: Id<"journeys">;
  savedContent: string;
  savedGrade: EntryGrade | null;
  targetRole: string;
}

function TaskPanel({
  task,
  taskIndex,
  stepId,
  journeyId,
  savedContent,
  savedGrade,
  targetRole,
}: TaskPanelProps) {
  const [value, setValue] = useState(savedContent);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    savedContent.length > 0 ? "saved" : "idle",
  );
  const [isGrading, setIsGrading] = useState(false);
  const [gradedContent, setGradedContent] = useState(
    savedGrade ? savedContent : "",
  );

  const upsert = useMutation(api.stepEntries.upsert);
  const gradeEntry = useAction(api.stepEntries.gradeEntry);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(savedContent);
  }, [savedContent]);

  useEffect(() => {
    if (savedGrade) {
      setIsGrading(false);
      setGradedContent(savedContent);
    }
  }, [savedGrade, savedContent]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (gradeTimerRef.current) clearTimeout(gradeTimerRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const content = e.target.value;
      setValue(content);

      if (content.trim().length === 0) {
        setSaveState("idle");
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        if (gradeTimerRef.current) clearTimeout(gradeTimerRef.current);
        return;
      }

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveState("saving");
      saveTimerRef.current = setTimeout(async () => {
        await upsert({ stepId, journeyId, taskIndex, content });
        setSaveState("saved");
      }, SAVE_DEBOUNCE_MS);

      if (gradeTimerRef.current) clearTimeout(gradeTimerRef.current);
      if (content.trim().length >= GRADE_MIN_LENGTH) {
        gradeTimerRef.current = setTimeout(async () => {
          setIsGrading(true);
          setGradedContent(content);
          try {
            await gradeEntry({
              stepId,
              taskIndex,
              taskTitle: task.title,
              taskPrompts: task.prompts,
              content,
              targetRole,
            });
          } catch {
            setIsGrading(false);
          }
        }, GRADE_DEBOUNCE_MS);
      }
    },
    [upsert, gradeEntry, stepId, journeyId, taskIndex, task.title, task.prompts, targetRole],
  );

  const gradeIsStale = savedGrade && value !== gradedContent;
  const showGrade = savedGrade && !gradeIsStale;
  const isRegrading = showGrade && isGrading;

  const promptPlaceholder = task.prompts.map((p) => `${p}\n`).join("\n");

  return (
    <div className="space-y-4 pt-1">
      <h3 className="mt-6 text-center text-base font-semibold">{task.title}</h3>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Guidance
        </h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {task.guidance}
        </p>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Writing prompts
        </h4>
        <ul className="mt-1 space-y-1">
          {task.prompts.map((prompt, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm text-muted-foreground"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
              {prompt}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your response
          </h4>
          <div className="flex items-center gap-3">
            {isGrading && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Grading…
              </span>
            )}
            {saveState === "saving" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </span>
            )}
            {saveState === "saved" && !isGrading && (
              <span className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="h-3 w-3" />
                Saved
              </span>
            )}
          </div>
        </div>
        <Textarea
          className="mt-1.5 min-h-32"
          placeholder={promptPlaceholder}
          value={value}
          onChange={handleChange}
        />
        <div className="mt-1 flex justify-end">
          <span
            className={`text-xs ${
              value.length > 0 && value.length < GRADE_MIN_LENGTH
                ? "text-warning"
                : "text-muted-foreground"
            }`}
          >
            {value.length}
            {value.length > 0 && value.length < GRADE_MIN_LENGTH && (
              <span> / {GRADE_MIN_LENGTH} min for grading</span>
            )}
          </span>
        </div>
      </div>

      {showGrade && (
        <div className="relative">
          {isRegrading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Regrading…
              </span>
            </div>
          )}
          <GradeFeedback grade={savedGrade} />
        </div>
      )}

      {isGrading && !showGrade && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          Analysing your response…
        </div>
      )}
    </div>
  );
}

interface EvidenceCaptureOutputProps {
  output: EvidenceCaptureOutput;
  stepId: Id<"steps">;
  journeyId: Id<"journeys">;
  targetRole?: string;
}

export function EvidenceCaptureOutputDisplay({
  output,
  stepId,
  journeyId,
  targetRole,
}: EvidenceCaptureOutputProps) {
  const entries = useSuspenseQuery(api.stepEntries.getByStep, { stepId });

  const entryMap = new Map<
    number,
    { content: string; grade: EntryGrade | null }
  >();
  for (const entry of entries ?? []) {
    entryMap.set(entry.taskIndex, {
      content: entry.content,
      grade: (entry.grade as EntryGrade | undefined) ?? null,
    });
  }

  const completedCount = output.tasks.filter(
    (_, i) => entryMap.get(i)?.grade != null,
  ).length;

  const firstIncomplete = output.tasks.findIndex(
    (_, i) => entryMap.get(i)?.grade == null,
  );
  const defaultTab = firstIncomplete === -1 ? "0" : String(firstIncomplete);

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {output.introduction}
      </p>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Tasks ({output.tasks.length})
        </h3>
        <span className="text-xs font-medium text-muted-foreground">
          {completedCount} of {output.tasks.length} completed
        </span>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full flex-wrap justify-start" variant="line">
          {output.tasks.map((task, i) => {
            const grade = entryMap.get(i)?.grade ?? null;
            return (
              <TabsTrigger key={i} value={String(i)} className="gap-1.5">
                {grade ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                Task {i + 1}
                {grade && <GradeBadge letter={grade.letter} />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {output.tasks.map((task, i) => (
          <TabsContent key={i} value={String(i)}>
            <TaskPanel
              task={task}
              taskIndex={i}
              stepId={stepId}
              journeyId={journeyId}
              savedContent={entryMap.get(i)?.content ?? ""}
              savedGrade={entryMap.get(i)?.grade ?? null}
              targetRole={targetRole ?? "the target role"}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="rounded-lg bg-muted/30 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Next action
        </h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {output.nextAction}
        </p>
      </div>
    </div>
  );
}
