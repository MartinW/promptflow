"use client";

import { namespaceColor } from "@promptflow/core";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import Link from "next/link";

export interface PromptNodeData {
  name: string;
  version: number;
  tags: string[];
  references: number;
  referencedBy: number;
  /** Highlight when this is the focus of a per-prompt graph. */
  isFocused?: boolean;
  [key: string]: unknown;
}

/**
 * Renders a single prompt as a draggable canvas node. The badge colour matches
 * the first namespaced tag (or the name itself as a fallback) so users can
 * see groupings at a glance.
 */
export function PromptNode({ data, selected }: NodeProps) {
  const d = data as PromptNodeData;
  const accentTag = d.tags.find((t) => t.includes(":")) ?? d.tags[0] ?? d.name;
  const color = namespaceColor(accentTag);

  return (
    <div
      className={
        "group relative w-[200px] rounded-md border bg-card shadow-sm transition-shadow hover:shadow-md " +
        (selected ? "ring-2 ring-primary" : "") +
        (d.isFocused ? " ring-2 ring-accent" : "")
      }
      style={{ borderColor: `hsl(${color.hue} 50% 75%)` }}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <Link
        href={`/prompts/${encodeURIComponent(d.name)}`}
        className="block px-3 py-2 text-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium" title={d.name}>
            {d.name.split("/").pop() ?? d.name}
          </span>
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            v{d.version}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {d.references > 0 ? <span>↗ {d.references}</span> : null}
          {d.referencedBy > 0 ? <span>↙ {d.referencedBy}</span> : null}
        </div>
      </Link>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  );
}
