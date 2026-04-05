"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { useSuspenseQuery } from "@/hooks/use-suspense-query";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  GapAnalysisOutput,
  GapAnalysisTask,
  EnrichedResource,
  EntryGrade,
} from "@/lib/ai/schemas";
import {
  SpeechTextarea,
  useSpeechTextarea,
} from "@/components/ui/speech-textarea";
import { GradeBadge, GradeFeedback } from "@/components/journey/grade-feedback-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Globe,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Gauge,
  Briefcase,
  ClipboardList,
  Book,
  GraduationCap,
  Newspaper,
  FolderKanban,
  Users,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared pill tab styling (section switcher + per-task tabs) */
const GAP_PILL_TAB_LIST_CLASS =
  "flex w-full flex-col items-stretch gap-2 sm:inline-flex sm:flex-row sm:flex-wrap sm:gap-1 sm:items-center sm:justify-start";

const GAP_PILL_TAB_TRIGGER_CLASS =
  "h-auto min-h-9 w-full justify-center gap-1.5 whitespace-normal text-center data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:!shadow-none data-[state=active]:text-card-foreground dark:data-[state=active]:bg-card dark:data-[state=active]:text-card-foreground sm:h-[calc(100%-1px)] sm:w-auto sm:flex-1 sm:justify-center sm:whitespace-nowrap";

const SAVE_DEBOUNCE_MS = 800;
const GRADE_DEBOUNCE_MS = 2000;
const GRADE_MIN_LENGTH = 50;

type GapView = "readiness" | "market" | "tasks";

const TAB_LABELS: Record<string, string> = {
  course: "Courses",
  book: "Books",
  article: "Articles",
  project: "Projects",
  community: "Communities",
  other: "Other",
};

const RESOURCE_TYPE_ICONS: Record<string, LucideIcon> = {
  course: GraduationCap,
  book: Book,
  article: Newspaper,
  project: FolderKanban,
  community: Users,
  other: LayoutGrid,
};

const RESOURCE_VERTICAL_TAB_TRIGGER_CLASS =
  "flex h-auto min-h-9 w-full items-center justify-start gap-2 px-2.5 py-2 text-left text-sm font-medium whitespace-normal text-foreground/80 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:!shadow-none data-[state=active]:text-card-foreground dark:data-[state=active]:bg-card dark:data-[state=active]:text-card-foreground sm:px-3 data-[state=active]:[&_svg]:text-foreground";

/** Same as TaskPanel (Guidance, Writing prompts, Your response) */
const SECTION_HEADING_CLASS =
  "text-sm font-semibold uppercase tracking-wide text-foreground";

const levelColours: Record<string, string> = {
  none: "bg-danger/10 text-danger",
  beginner: "bg-warning/10 text-warning",
  intermediate: "bg-accent/10 text-accent",
  advanced: "bg-success/10 text-success",
  expert: "bg-success/20 text-success",
};

const priorityStyles: Record<string, string> = {
  high: "bg-danger/10 text-danger",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

interface GapAnalysisOutputProps {
  output: GapAnalysisOutput;
  stepId?: Id<"steps">;
  journeyId?: Id<"journeys">;
  targetRole?: string;
  marketInsightsSlot?: React.ReactNode;
}

export function GapAnalysisOutputDisplay({
  output,
  stepId,
  journeyId,
  targetRole,
  marketInsightsSlot,
}: GapAnalysisOutputProps) {
  const hasTasks =
    Array.isArray(output.tasks) && output.tasks.length > 0 && stepId && journeyId;
  const hasMarket = !!marketInsightsSlot;

  const sectionTabs = useMemo(() => {
    const tabs: { value: GapView; label: string; icon: LucideIcon }[] = [
      { value: "readiness", label: "Readiness", icon: Gauge },
    ];
    if (hasMarket) {
      tabs.push({ value: "market", label: "Market Insights", icon: Briefcase });
    }
    if (hasTasks) {
      tabs.push({
        value: "tasks",
        label: "Evidence & Plans",
        icon: ClipboardList,
      });
    }
    return tabs;
  }, [hasMarket, hasTasks]);

  const showSectionTabs = sectionTabs.length > 1;

  if (!showSectionTabs) {
    return (
      <div className="space-y-6">
        <ReadinessView output={output} hasTasks={!!hasTasks} />
      </div>
    );
  }

  return (
    <Tabs defaultValue="readiness" className="gap-4">
      <TabsList className={GAP_PILL_TAB_LIST_CLASS}>
        {sectionTabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={GAP_PILL_TAB_TRIGGER_CLASS}
          >
            <tab.icon className="h-3.5 w-3.5 shrink-0" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="readiness">
        <ReadinessView output={output} hasTasks={!!hasTasks} />
      </TabsContent>

      {hasMarket && (
        <TabsContent value="market">{marketInsightsSlot}</TabsContent>
      )}

      {hasTasks && (
        <TabsContent value="tasks">
          <InteractiveTasksSection
            tasks={output.tasks!}
            skills={output.skills}
            stepId={stepId!}
            journeyId={journeyId!}
            targetRole={targetRole ?? "the target role"}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

/* ------------------------------------------------------------------ */
/*  Readiness view                                                     */
/* ------------------------------------------------------------------ */

function ReadinessView({
  output,
  hasTasks,
}: {
  output: GapAnalysisOutput;
  hasTasks: boolean;
}) {
  const skillsWithTasks = useMemo(() => {
    if (!output.tasks) return new Set<string>();
    return new Set(output.tasks.map((t) => t.skillName));
  }, [output.tasks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-xl border border-border p-5">
        <div className="relative h-16 w-16">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              className="text-muted"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              className="text-accent"
              strokeWidth="3"
              strokeDasharray={`${output.overallReadiness}, 100`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {output.overallReadiness}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Overall Readiness</h3>
          <p className="text-sm text-muted-foreground">
            {output.overallReadiness >= 70
              ? "You're well positioned for this transition."
              : output.overallReadiness >= 40
                ? "Some gaps to address, but a strong foundation."
                : "Significant development needed — but that's okay."}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Skills Assessment</h3>
        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Skill</th>
                <th className="px-4 py-2 text-left font-medium">Current</th>
                <th className="px-4 py-2 text-left font-medium">Required</th>
                <th className="px-4 py-2 text-left font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {output.skills.map((skill, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {skill.name}
                    {hasTasks && skillsWithTasks.has(skill.name) && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${levelColours[skill.currentLevel]}`}
                    >
                      {skill.currentLevel}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${levelColours[skill.requiredLevel]}`}
                    >
                      {skill.requiredLevel}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${priorityStyles[skill.priority]}`}
                    >
                      {skill.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {output.quickWins.length > 0 && (
        <div>
          <h4 className={cn(SECTION_HEADING_CLASS, "mb-3")}>Quick wins</h4>
          <ul className="space-y-1.5">
            {output.quickWins.map((win, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                <span>{win}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {output.longerTermGaps.length > 0 && (
        <div>
          <h4 className={cn(SECTION_HEADING_CLASS, "mb-3")}>
            Longer-term gaps
          </h4>
          <ul className="space-y-1.5">
            {output.longerTermGaps.map((gap, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {output.suggestedResources.length > 0 && (
        <ResourceTabs resources={output.suggestedResources} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Interactive tasks section                                          */
/* ------------------------------------------------------------------ */

interface InteractiveTasksSectionProps {
  tasks: GapAnalysisTask[];
  skills: GapAnalysisOutput["skills"];
  stepId: Id<"steps">;
  journeyId: Id<"journeys">;
  targetRole: string;
}

function InteractiveTasksSection({
  tasks,
  skills,
  stepId,
  journeyId,
  targetRole,
}: InteractiveTasksSectionProps) {
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

  const completedCount = tasks.filter(
    (_, i) => (entryMap.get(i)?.content ?? "").trim().length > 0,
  ).length;

  const firstIncomplete = tasks.findIndex(
    (_, i) => (entryMap.get(i)?.content ?? "").trim().length === 0,
  );
  const defaultTab = firstIncomplete === -1 ? "0" : String(firstIncomplete);

  const skillMap = useMemo(() => {
    const map = new Map<string, GapAnalysisOutput["skills"][number]>();
    for (const s of skills) map.set(s.name, s);
    return map;
  }, [skills]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Skill Evidence & Plans ({tasks.length})
        </h3>
        <span className="text-xs font-medium text-muted-foreground">
          {completedCount} of {tasks.length} completed
        </span>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        For each skill gap below, provide evidence of your current capability
        and outline a concrete plan to reach the required level. Your responses
        will be graded automatically.
      </p>

      <Tabs defaultValue={defaultTab} className="gap-4">
        <TabsList className={GAP_PILL_TAB_LIST_CLASS}>
          {tasks.map((task, i) => {
            const hasContent =
              (entryMap.get(i)?.content ?? "").trim().length > 0;
            const grade = entryMap.get(i)?.grade ?? null;
            return (
              <TabsTrigger
                key={i}
                value={String(i)}
                className={GAP_PILL_TAB_TRIGGER_CLASS}
              >
                {hasContent ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                {task.skillName}
                {grade && <GradeBadge letter={grade.letter} />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tasks.map((task, i) => (
          <TabsContent key={i} value={String(i)}>
            <SkillTaskPanel
              task={task}
              taskIndex={i}
              skill={skillMap.get(task.skillName)}
              stepId={stepId}
              journeyId={journeyId}
              savedContent={entryMap.get(i)?.content ?? ""}
              savedGrade={entryMap.get(i)?.grade ?? null}
              targetRole={targetRole}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Per-skill task panel                                               */
/* ------------------------------------------------------------------ */

interface SkillTaskPanelProps {
  task: GapAnalysisTask;
  taskIndex: number;
  skill?: GapAnalysisOutput["skills"][number];
  stepId: Id<"steps">;
  journeyId: Id<"journeys">;
  savedContent: string;
  savedGrade: EntryGrade | null;
  targetRole: string;
}

function SkillTaskPanel({
  task,
  taskIndex,
  skill,
  stepId,
  journeyId,
  savedContent,
  savedGrade,
  targetRole,
}: SkillTaskPanelProps) {
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
              stepType: "gap_analysis",
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

      {skill && (
        <div className="flex items-center justify-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Current:{" "}
            <span
              className={`rounded px-1.5 py-0.5 font-medium capitalize ${levelColours[skill.currentLevel]}`}
            >
              {skill.currentLevel}
            </span>
          </span>
          <span className="text-muted-foreground">&rarr;</span>
          <span className="text-muted-foreground">
            Required:{" "}
            <span
              className={`rounded px-1.5 py-0.5 font-medium capitalize ${levelColours[skill.requiredLevel]}`}
            >
              {skill.requiredLevel}
            </span>
          </span>
          <span
            className={`rounded px-1.5 py-0.5 font-medium capitalize ${priorityStyles[skill.priority]}`}
          >
            {skill.priority}
          </span>
        </div>
      )}

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

/* ------------------------------------------------------------------ */
/*  Resource tabs                                                      */
/* ------------------------------------------------------------------ */

function ResourceTabs({ resources }: { resources: EnrichedResource[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, EnrichedResource[]> = {};
    for (const res of resources) {
      const key = res.type;
      if (!map[key]) map[key] = [];
      map[key].push(res);
    }
    return map;
  }, [resources]);

  const categories = Object.keys(grouped);
  if (categories.length === 0) return null;

  return (
    <div>
      <h4 className={cn(SECTION_HEADING_CLASS, "mb-3")}>Suggested resources</h4>
      <Tabs
        defaultValue={categories[0]}
        orientation="vertical"
        className="flex w-full flex-col gap-4 sm:flex-row sm:gap-6 sm:items-start"
      >
        <TabsList className="flex h-auto w-full shrink-0 flex-col items-stretch gap-1 rounded-lg bg-muted p-1 sm:w-auto sm:min-w-[12rem]">
          {categories.map((cat) => {
            const Icon = RESOURCE_TYPE_ICONS[cat] ?? LayoutGrid;
            return (
              <TabsTrigger
                key={cat}
                value={cat}
                className={RESOURCE_VERTICAL_TAB_TRIGGER_CLASS}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                {TAB_LABELS[cat] ?? cat}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="min-w-0 flex-1">
            <div className="space-y-2">
              {grouped[cat].map((res, i) => (
                <ResourceCard key={i} resource={res} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ResourceCard({ resource }: { resource: EnrichedResource }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        {resource.favicon ? (
          <img
            src={resource.favicon}
            alt=""
            width={20}
            height={20}
            className="rounded-sm"
          />
        ) : (
          <Globe className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        {resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            {resource.title}
          </a>
        ) : (
          <p className="text-sm font-medium">{resource.title}</p>
        )}
        {resource.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {resource.description}
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          For: {resource.skill}
        </p>
      </div>
    </div>
  );
}
