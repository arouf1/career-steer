/**
 * Shared rules for whether a step with generated `tasks` in its output may be
 * marked complete. Mirrors the completion criteria used in gap analysis and
 * evidence capture UIs.
 */

export type StepEntryLite = {
  taskIndex: number;
  content: string;
  grade?: {
    letter: string;
    summary: string;
    strengths: string[];
    improvements: string[];
  };
};

export type StepTaskCheck = {
  type: string;
  output: unknown;
};

export function stepOutputHasTasks(output: unknown): boolean {
  if (output === null || output === undefined || typeof output !== "object") {
    return false;
  }
  const tasks = (output as { tasks?: unknown }).tasks;
  return Array.isArray(tasks) && tasks.length > 0;
}

/**
 * Returns `null` when the step may be marked complete with respect to tasks.
 * Otherwise returns a short user-facing reason (British English).
 */
export function getStepTasksIncompleteReason(
  step: StepTaskCheck,
  entries: StepEntryLite[],
): string | null {
  if (!stepOutputHasTasks(step.output)) return null;

  const tasks = (step.output as { tasks: unknown[] }).tasks;
  const taskCount = tasks.length;

  const byIndex = new Map<number, StepEntryLite>();
  for (const e of entries) {
    byIndex.set(e.taskIndex, e);
  }

  if (step.type === "evidence_capture") {
    for (let i = 0; i < taskCount; i++) {
      if (byIndex.get(i)?.grade == null) {
        return "Complete every task and wait for feedback on each before marking this step complete.";
      }
    }
    return null;
  }

  if (step.type === "gap_analysis") {
    for (let i = 0; i < taskCount; i++) {
      const content = byIndex.get(i)?.content ?? "";
      if (content.trim().length === 0) {
        return "Complete every skill evidence task before marking this step complete.";
      }
    }
    return null;
  }

  for (let i = 0; i < taskCount; i++) {
    const content = byIndex.get(i)?.content ?? "";
    if (content.trim().length === 0) {
      return "Complete every task before marking this step complete.";
    }
  }
  return null;
}
