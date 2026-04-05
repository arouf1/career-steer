"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { useSuspenseQuery } from "@/hooks/use-suspense-query";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { EvidenceCaptureOutput, EntryGrade } from "@/lib/ai/schemas";
import {
  SpeechTextarea,
  useSpeechTextarea,
} from "@/components/ui/speech-textarea";
import { GradeBadge, GradeFeedback } from "@/components/journey/grade-feedback-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";

const SAVE_DEBOUNCE_MS = 800;
const GRADE_DEBOUNCE_MS = 2000;
const GRADE_MIN_LENGTH = 50;

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
    }
  }, [savedGrade]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (gradeTimerRef.current) clearTimeout(gradeTimerRef.current);
    };
  }, []);

  const handleContentChange = useCallback(
    (content: string) => {
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

  const { textareaRef, handleChange, speech } = useSpeechTextarea({
    value,
    setValue,
    onCommit: handleContentChange,
  });

  /** Persisted grade stays visible while editing; overlay only during regrade. */
  const showGrade = savedGrade != null;
  const isRegrading = savedGrade != null && isGrading;

  const promptPlaceholder = task.prompts.map((p) => `${p}\n`).join("\n");

  const sectionHeading =
    "text-sm font-semibold uppercase tracking-wide text-foreground";

  return (
    <div className="space-y-6 pt-1">
      <h3 className="mt-6 text-center text-base font-semibold">{task.title}</h3>

      <div>
        <h4 className={cn(sectionHeading, "mb-3")}>Guidance</h4>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {task.guidance}
        </p>
      </div>

      <div>
        <h4 className={cn(sectionHeading, "mb-3")}>Writing prompts</h4>
        <ul className="space-y-1.5">
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h4 className={sectionHeading}>Your response</h4>
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
        <SpeechTextarea
          textareaRef={textareaRef}
          isRecording={speech.isRecording}
          className="mt-1.5 min-h-48"
          placeholder={promptPlaceholder}
          value={value}
          onChange={handleChange}
          characterCount={
            <span
              className={
                value.length > 0 && value.length < GRADE_MIN_LENGTH
                  ? "text-warning"
                  : "text-muted-foreground"
              }
            >
              {value.length}
              {value.length > 0 && value.length < GRADE_MIN_LENGTH && (
                <span> / {GRADE_MIN_LENGTH} min for grading</span>
              )}
            </span>
          }
          mic={{
            isRecording: speech.isRecording,
            isConnecting: speech.isConnecting,
            isSupported: speech.isSupported,
            error: speech.error,
            liveTranscript: speech.liveTranscript,
            onStart: speech.startRecording,
            onStop: speech.stopRecording,
          }}
        />
      </div>

      {showGrade && (
        <div className="relative">
          {isRegrading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-background/60 backdrop-blur-[1px]">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Regrading…
              </span>
            </div>
          )}
          <GradeFeedback grade={savedGrade} />
        </div>
      )}

      {isGrading && !savedGrade && (
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

      <Tabs defaultValue={defaultTab} className="gap-4">
        <TabsList className="flex w-full flex-col items-stretch gap-2 sm:inline-flex sm:flex-row sm:flex-wrap sm:gap-1 sm:items-center sm:justify-start">
          {output.tasks.map((task, i) => {
            const grade = entryMap.get(i)?.grade ?? null;
            return (
              <TabsTrigger
                key={i}
                value={String(i)}
                className="h-auto min-h-9 w-full justify-center gap-1.5 whitespace-normal text-center data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:!shadow-none data-[state=active]:text-card-foreground dark:data-[state=active]:bg-card dark:data-[state=active]:text-card-foreground sm:h-[calc(100%-1px)] sm:w-auto sm:flex-1 sm:justify-center sm:whitespace-nowrap"
              >
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
