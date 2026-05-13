"use client";

import type { NodeProps } from "@xyflow/react";
import { FolderIcon } from "lucide-react";

export interface FolderGroupNodeData {
  folderPath: string;
  count: number;
  [key: string]: unknown;
}

/**
 * Container node that visually groups a folder's prompts on the canvas.
 * The actual child prompts are positioned by React Flow's parentNode
 * mechanism — this node provides the framing and label only.
 */
export function FolderGroupNode({ data }: NodeProps) {
  const d = data as FolderGroupNodeData;
  return (
    <div className="pointer-events-none size-full rounded-lg border-2 border-dashed border-muted-foreground/40 bg-muted/20">
      <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <FolderIcon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate font-mono">{d.folderPath}/</span>
        <span className="ml-auto rounded bg-background/70 px-1.5 py-0.5 text-[10px]">
          {d.count}
        </span>
      </div>
    </div>
  );
}
