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
import { Textarea } from "@/components/ui/textarea";
import {
  Globe,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Gauge,
  Briefcase,
  ClipboardList,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AnimatedSwitch,
  type SwitchOption,
} from "@/components/ui/animated-switch";

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

  const switchOptions = useMemo(() => {
    const opts: SwitchOption<GapView>[] = [
      { key: "readiness", label: "Readiness", icon: Gauge },
    ];
    if (hasMarket) {
      opts.push({ key: "market", label: "Market Insights", icon: Briefcase });
    }
    if (hasTasks) {
      opts.push({
        key: "tasks",
        label: "Evidence & Plans",
        icon: ClipboardList,
      });
    }
    return opts;
  }, [hasMarket, hasTasks]);

  const showSwitch = switchOptions.length > 1;
  const [activeView, setActiveView] = useState<GapView>("readiness");

  return (
    <div className="space-y-6">
      {showSwitch && (
        <AnimatedSwitch
          options={switchOptions}
          activeOption={activeView}
          onOptionChange={setActiveView}
          size="sm"
          layoutId="gap-analysis-switch"
        />
      )}

      {activeView === "readiness" && (
        <ReadinessView output={output} hasTasks={!!hasTasks} />
      )}

      {activeView === "market" && hasMarket && marketInsightsSlot}

      {activeView === "tasks" && hasTasks && (
        <InteractiveTasksSection
          tasks={output.tasks!}
          skills={output.skills}
          stepId={stepId}
          journeyId={journeyId}
          targetRole={targetRole ?? "the target role"}
        />
      )}
    </div>
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
    <>
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
          <h3 className="text-lg font-semibold">Quick Wins</h3>
          <ul className="mt-2 space-y-2">
            {output.quickWins.map((win, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                <span className="text-muted-foreground">{win}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {output.longerTermGaps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Longer-term Gaps</h3>
          <ul className="mt-2 space-y-2">
            {output.longerTermGaps.map((gap, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                <span className="text-muted-foreground">{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {output.suggestedResources.length > 0 && (
        <ResourceTabs resources={output.suggestedResources} />
      )}
    </>
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

      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full flex-wrap justify-start" variant="line">
          {tasks.map((task, i) => {
            const hasContent =
              (entryMap.get(i)?.content ?? "").trim().length > 0;
            const grade = entryMap.get(i)?.grade ?? null;
            return (
              <TabsTrigger key={i} value={String(i)} className="gap-1.5">
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

  const gradeIsStale = savedGrade && value !== gradedContent;
  const showGrade = savedGrade && !gradeIsStale;
  const isRegrading = showGrade && isGrading;

  const promptPlaceholder = task.prompts.map((p) => `${p}\n`).join("\n");

  return (
    <div className="space-y-4 pt-1">
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

/* ------------------------------------------------------------------ */
/*  Grading UI                                                         */
/* ------------------------------------------------------------------ */

function GradeBadge({ letter }: { letter: string }) {
  const colours =
    GRADE_COLOURS[letter] ?? "bg-muted text-muted-foreground border-border";
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
      <h3 className="text-lg font-semibold">Suggested Resources</h3>
      <Tabs defaultValue={categories[0]} className="mt-3">
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {TAB_LABELS[cat] ?? cat}
            </TabsTrigger>
          ))}
        </TabsList>
        {categories.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <div className="mt-2 space-y-2">
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
