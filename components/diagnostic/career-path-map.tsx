"use client";

import { useMemo, useCallback } from "react";
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

interface BridgeSkill {
  skill: string;
  level: "strong" | "partial" | "gap";
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

function BridgeSkillNode({ data }: NodeProps) {
  const level = data.level as keyof typeof LEVEL_COLOURS;
  const colour = LEVEL_COLOURS[level];
  return (
    <div
      className="rounded-full border-2 px-3 py-1.5 text-xs font-medium"
      style={{ borderColor: colour, color: colour, backgroundColor: `${colour}10` }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      {data.label as string}
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

function TargetRoleNode({ data }: NodeProps) {
  const isSelected = data.isSelected as boolean;
  const onClick = data.onClick as () => void;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 bg-background px-5 py-4 text-left shadow-sm transition-all ${
        isSelected
          ? "border-accent ring-2 ring-accent/20"
          : "border-border hover:border-muted-foreground/30"
      }`}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
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
}: CareerPathMapProps) {
  const { nodes, edges } = useMemo(() => {
    const builtNodes: Node[] = [];
    const builtEdges: Edge[] = [];

    const currentNode: Node = {
      id: "current",
      type: "currentRole",
      position: { x: 0, y: 200 },
      data: { label: currentRole },
    };
    builtNodes.push(currentNode);

    const allSkills = new Map<string, BridgeSkill>();
    pathMapData.forEach((role) => {
      role.bridgeSkills.forEach((bs) => {
        if (!allSkills.has(bs.skill)) {
          allSkills.set(bs.skill, bs);
        }
      });
    });

    const skillArray = Array.from(allSkills.entries());
    const skillStartY = 200 - ((skillArray.length - 1) * 60) / 2;

    skillArray.forEach(([skill, bs], i) => {
      const nodeId = `skill-${skill}`;
      builtNodes.push({
        id: nodeId,
        type: "bridgeSkill",
        position: { x: 300, y: skillStartY + i * 60 },
        data: { label: skill, level: bs.level },
      });
      builtEdges.push({
        id: `current-${nodeId}`,
        source: "current",
        target: nodeId,
        style: { stroke: LEVEL_COLOURS[bs.level], strokeWidth: 1.5 },
        animated: bs.level === "gap",
      });
    });

    const roleStartY = 200 - ((pathMapData.length - 1) * 140) / 2;

    pathMapData.forEach((role, i) => {
      const roleId = `role-${i}`;
      builtNodes.push({
        id: roleId,
        type: "targetRole",
        position: { x: 600, y: roleStartY + i * 140 },
        data: {
          label: role.targetRole,
          fitScore: role.fitScore,
          salaryRange: role.salaryRange,
          timelineEstimate: role.timelineEstimate,
          isSelected: selectedRole === role.targetRole,
          onClick: () => onSelectRole(role.targetRole),
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

  const onInit = useCallback((instance: { fitView: () => void }) => {
    setTimeout(() => instance.fitView(), 50);
  }, []);

  return (
    <div className="h-[450px] w-full rounded-lg border border-border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
      </ReactFlow>
    </div>
  );
}
