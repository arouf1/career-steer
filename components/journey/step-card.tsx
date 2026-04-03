"use client";

import Link from "next/link";
import {
  Lock,
  Circle,
  CheckCircle2,
  FileText,
  Link2,
  MessageSquare,
  BarChart3,
  BookOpen,
  Users,
  Send,
  Pencil,
  Trophy,
  UserCheck,
  Heart,
  Sparkles,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { STEP_TYPES, type StepType } from "@/lib/constants";

const iconMap: Record<string, React.ElementType> = {
  FileText,
  Link2,
  MessageSquare,
  BarChart3,
  BookOpen,
  Users,
  Send,
  Pencil,
  Trophy,
  UserCheck,
  Heart,
  Sparkles,
};

interface StepCardProps {
  step: {
    _id: Id<"steps">;
    type: StepType;
    title: string;
    description: string;
    status: "locked" | "available" | "in_progress" | "completed" | "skipped";
  };
  journeyId: Id<"journeys">;
}

export function StepCard({ step, journeyId }: StepCardProps) {
  const typeInfo = STEP_TYPES[step.type];
  const Icon = iconMap[typeInfo?.icon ?? "Sparkles"] ?? Sparkles;

  const isActionable =
    step.status === "available" ||
    step.status === "in_progress" ||
    step.status === "completed";

  const statusBadge = {
    locked: { label: "Locked", className: "text-muted-foreground bg-muted" },
    available: { label: "Available", className: "text-accent bg-accent/10" },
    in_progress: {
      label: "In progress",
      className: "text-warning bg-warning/10",
    },
    completed: {
      label: "Complete",
      className: "text-success bg-success/10",
    },
    skipped: { label: "Skipped", className: "text-muted-foreground bg-muted" },
  }[step.status];

  const StatusIndicator = () => {
    switch (step.status) {
      case "locked":
        return <Lock className="h-4 w-4 text-muted-foreground" />;
      case "completed":
      case "skipped":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Circle className="h-4 w-4 text-accent" />;
    }
  };

  const card = (
    <div
      className={`group rounded-xl border p-4 transition-all ${
        isActionable
          ? "border-border hover:border-accent/40 hover:shadow-sm"
          : "border-border/50 opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{step.title}</span>
            <StatusIndicator />
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {step.description}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {typeInfo?.label ?? step.type}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isActionable) {
    return (
      <Link href={`/journey/${journeyId}/step/${step._id}`}>{card}</Link>
    );
  }

  return card;
}
