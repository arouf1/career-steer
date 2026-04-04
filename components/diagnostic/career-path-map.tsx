"use client";

import { useMemo, useCallback, type MouseEvent } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  Background,
  BackgroundVariant,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";

interface BridgeSkill {
  skill: string;
  level: "strong" | "partial" | "gap";
  reasoning?: string;
}

interface PathMapRole {
  targetRole: string;
  fitScore: number;
  salaryRange: string;
  timelineEstimate: string;
  bridgeSkills: BridgeSkill[];
}

interface CareerPathMapProps {
  currentRole: string;
  pathMapData: PathMapRole[];
  selectedRole: string | null;
  onSelectRole: (role: string) => void;
  className?: string;
}

const LEVEL_COLOURS = {
  strong: "#16A34A",
  partial: "#D97706",
  gap: "#DC2626",
} as const;

function CurrentRoleNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-foreground bg-background px-5 py-4 shadow-sm">
      <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        You are here
      </span>
      <span className="mt-1 block text-sm font-semibold text-foreground">
        {data.label as string}
      </span>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

const LEVEL_LABELS: Record<string, string> = {
  strong: "Strong",
  partial: "Partial",
  gap: "Gap",
};

function BridgeSkillNode({ data }: NodeProps) {
  const level = data.level as keyof typeof LEVEL_COLOURS;
  const colour = LEVEL_COLOURS[level];
  const reasoning = data.reasoning as string | undefined;

  const pill = (
    <div
      className="rounded-full border-2 px-3 py-1.5 text-xs font-medium"
      style={{
        borderColor: colour,
        color: colour,
        backgroundColor: `${colour}10`,
      }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      {data.label as string}
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );

  if (!reasoning) return pill;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{pill}</HoverCardTrigger>
      <HoverCardContent side="top" className="w-72 text-left">
        <p className="text-sm font-semibold text-foreground">
          {data.label as string}
        </p>
        <span
          className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            color: colour,
            backgroundColor: `${colour}15`,
          }}
        >
          {LEVEL_LABELS[level] ?? level}
        </span>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {reasoning}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}

function TargetRoleNode({ data }: NodeProps) {
  const isSelected = data.isSelected as boolean;
  return (
    <button
      type="button"
      className={`nopan nodrag rounded-lg border-2 bg-background px-5 py-4 text-left shadow-sm transition-all ${
        isSelected
          ? "border-accent ring-2 ring-accent/20"
          : "border-border hover:border-muted-foreground/30"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="pointer-events-none opacity-0"
      />
      <span className="block text-sm font-semibold text-foreground">
        {data.label as string}
      </span>
      <div className="mt-1.5 space-y-0.5">
        <span className="block text-xs text-muted-foreground">
          Fit: <span className="font-medium text-accent">{data.fitScore as number}%</span>
        </span>
        <span className="block text-xs text-muted-foreground">
          {data.salaryRange as string}
        </span>
        <span className="block text-xs text-muted-foreground">
          {data.timelineEstimate as string}
        </span>
      </div>
    </button>
  );
}

const nodeTypes = {
  currentRole: CurrentRoleNode,
  bridgeSkill: BridgeSkillNode,
  targetRole: TargetRoleNode,
};

export function CareerPathMap({
  currentRole,
  pathMapData,
  selectedRole,
  onSelectRole,
  className,
}: CareerPathMapProps) {
  const { nodes, edges } = useMemo(() => {
    const builtNodes: Node[] = [];
    const builtEdges: Edge[] = [];

    const allSkills = new Map<string, BridgeSkill>();
    pathMapData.forEach((role) => {
      role.bridgeSkills.forEach((bs) => {
        if (!allSkills.has(bs.skill)) {
          allSkills.set(bs.skill, bs);
        }
      });
    });

    const skillArray = Array.from(allSkills.entries());

    const SKILL_GAP_Y = 55;
    const ROLE_GAP_Y = 160;
    const CURRENT_ROLE_EST_HEIGHT = 65;
    const SKILL_NODE_HEIGHT = 32;
    const TARGET_ROLE_EST_HEIGHT = 110;

    const skillColumnHeight = Math.max(
      0,
      (skillArray.length - 1) * SKILL_GAP_Y + SKILL_NODE_HEIGHT,
    );
    const roleColumnHeight = Math.max(
      0,
      (pathMapData.length - 1) * ROLE_GAP_Y + TARGET_ROLE_EST_HEIGHT,
    );
    const totalHeight = Math.max(
      skillColumnHeight,
      roleColumnHeight,
      CURRENT_ROLE_EST_HEIGHT,
    );

    const COL_SKILL = 380;
    const COL_ROLE = 720;

    const currentY = totalHeight / 2 - CURRENT_ROLE_EST_HEIGHT / 2;
    builtNodes.push({
      id: "current",
      type: "currentRole",
      position: { x: 0, y: currentY },
      data: { label: currentRole },
    });

    const skillStartY = totalHeight / 2 - skillColumnHeight / 2;
    skillArray.forEach(([skill, bs], i) => {
      const nodeId = `skill-${skill}`;
      builtNodes.push({
        id: nodeId,
        type: "bridgeSkill",
        position: { x: COL_SKILL, y: skillStartY + i * SKILL_GAP_Y },
        data: { label: skill, level: bs.level, reasoning: bs.reasoning },
      });
      builtEdges.push({
        id: `current-${nodeId}`,
        source: "current",
        target: nodeId,
        style: { stroke: LEVEL_COLOURS[bs.level], strokeWidth: 1.5 },
        animated: bs.level === "gap",
      });
    });

    const roleStartY = totalHeight / 2 - roleColumnHeight / 2;
    pathMapData.forEach((role, i) => {
      const roleId = `role-${i}`;
      builtNodes.push({
        id: roleId,
        type: "targetRole",
        position: { x: COL_ROLE, y: roleStartY + i * ROLE_GAP_Y },
        data: {
          label: role.targetRole,
          fitScore: role.fitScore,
          salaryRange: role.salaryRange,
          timelineEstimate: role.timelineEstimate,
          isSelected: selectedRole === role.targetRole,
        },
      });

      role.bridgeSkills.forEach((bs) => {
        const skillId = `skill-${bs.skill}`;
        builtEdges.push({
          id: `${skillId}-${roleId}`,
          source: skillId,
          target: roleId,
          style: { stroke: LEVEL_COLOURS[bs.level], strokeWidth: 1.5 },
          animated: bs.level === "gap",
        });
      });
    });

    return { nodes: builtNodes, edges: builtEdges };
  }, [currentRole, pathMapData, selectedRole, onSelectRole]);

  const fitViewOptions = useMemo(() => ({ padding: 0.15 }), []);

  const onInit = useCallback(
    (instance: { fitView: (opts?: { padding?: number }) => void }) => {
      setTimeout(() => instance.fitView(fitViewOptions), 50);
    },
    [fitViewOptions],
  );

  const onNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      if (node.type !== "targetRole") return;
      const label = node.data.label;
      if (typeof label === "string") {
        onSelectRole(label);
      }
    },
    [onSelectRole],
  );

  return (
    <div
      className={cn(
        "h-[min(620px,65vh)] min-h-[480px] w-full rounded-lg border border-border bg-background",
        className,
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={fitViewOptions}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
      </ReactFlow>
    </div>
  );
}
