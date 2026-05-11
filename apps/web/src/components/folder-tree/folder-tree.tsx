"use client";

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { FolderNode } from "@promptflow/core";
import { ChevronRightIcon, FolderIcon, FolderOpenIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MoveConfirmDialog } from "./move-confirm-dialog";

interface FolderTreeProps {
  root: FolderNode;
  /** Current prompt name, used for highlighting and auto-expanding ancestors. */
  selectedName?: string;
  /** Current folder path, used to highlight the active folder in filter mode. */
  selectedPath?: string;
  /** Path under `/prompts` to use when generating links; defaults to `/prompts`. */
  basePath?: string;
  /** Enable drag-and-drop moves (renames). Off by default. */
  enableDnd?: boolean;
  /** Names with a production label, used for the move-confirm warning. */
  productionNames?: ReadonlySet<string>;
  className?: string;
}

interface PendingMove {
  oldName: string;
  newName: string;
  hasProductionLabel: boolean;
}

/**
 * Accessible folder tree for the prompt sidebar.
 *
 * Built directly with WAI-ARIA tree semantics (no library) since the only
 * interactions are expand/collapse and click-to-navigate. Drag-and-drop is
 * added in a later commit by wrapping the leaves with `@dnd-kit/core`.
 */
export function FolderTree({
  root,
  selectedName,
  selectedPath,
  basePath = "/prompts",
  enableDnd = false,
  productionNames,
  className,
}: FolderTreeProps) {
  // Ancestors of the selected prompt always start open so navigation feels
  // continuous after a click-through from the canvas / detail page.
  const initiallyOpen = useMemo(() => ancestorsOf(root, selectedName), [root, selectedName]);
  const [openPaths, setOpenPaths] = useState<Set<string>>(initiallyOpen);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  // Slightly raised activation distance so accidental drags during normal
  // click-to-navigate don't fire a move dialog.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function toggle(path: string): void {
    setOpenPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent): void {
    if (!event.over || !event.active) return;
    const oldName = String(event.active.id);
    const folderPath = String(event.over.id);
    const leaf = oldName.split("/").filter((s) => s.length > 0).pop() ?? oldName;
    const newName = folderPath ? `${folderPath}/${leaf}` : leaf;
    if (newName === oldName) return;
    setPendingMove({
      oldName,
      newName,
      hasProductionLabel: productionNames?.has(oldName) ?? false,
    });
  }

  const tree = (
    <nav
      aria-label="Prompt folders"
      className={cn("text-sm", className)}
      data-component="folder-tree"
    >
      <ul role="tree" className="space-y-0.5">
        {Array.from(root.children.values()).map((child) => (
          <FolderTreeItem
            key={child.path}
            node={child}
            depth={0}
            openPaths={openPaths}
            onToggle={toggle}
            selectedName={selectedName}
            selectedPath={selectedPath}
            basePath={basePath}
            enableDnd={enableDnd}
          />
        ))}
        {root.prompts.length > 0 ? (
          <li role="none" className="pt-1">
            <ul role="group" className="space-y-0.5">
              {root.prompts.map((name) => (
                <PromptLeaf
                  key={name}
                  name={name}
                  depth={0}
                  selected={name === selectedName}
                  basePath={basePath}
                  enableDnd={enableDnd}
                />
              ))}
            </ul>
          </li>
        ) : null}
      </ul>
    </nav>
  );

  return (
    <>
      {enableDnd ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {tree}
        </DndContext>
      ) : (
        tree
      )}
      {pendingMove ? (
        <MoveConfirmDialog
          open
          onOpenChange={(o) => {
            if (!o) setPendingMove(null);
          }}
          oldName={pendingMove.oldName}
          newName={pendingMove.newName}
          hasProductionLabel={pendingMove.hasProductionLabel}
        />
      ) : null}
    </>
  );
}

interface FolderTreeItemProps {
  node: FolderNode;
  depth: number;
  openPaths: Set<string>;
  onToggle: (path: string) => void;
  selectedName?: string;
  selectedPath?: string;
  basePath: string;
  enableDnd: boolean;
}

function FolderTreeItem({
  node,
  depth,
  openPaths,
  onToggle,
  selectedName,
  selectedPath,
  basePath,
  enableDnd,
}: FolderTreeItemProps) {
  const isOpen = openPaths.has(node.path);
  const isActive = selectedPath === node.path;
  const childCount = totalDescendants(node);
  const hasChildren = node.children.size > 0 || node.prompts.length > 0;

  const droppable = useDroppable({ id: node.path, disabled: !enableDnd });
  const dropClass = enableDnd && droppable.isOver ? "ring-2 ring-primary/60 bg-primary/5" : "";

  return (
    <li role="treeitem" aria-expanded={isOpen} aria-selected={isActive}>
      <div ref={droppable.setNodeRef} className={cn("flex items-center gap-1 rounded", dropClass)}>
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          className={cn(
            "flex flex-1 items-center gap-1 rounded px-1.5 py-0.5 text-left hover:bg-muted",
            isActive && "bg-muted font-medium",
          )}
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
          aria-label={`${isOpen ? "Collapse" : "Expand"} folder ${node.name}`}
        >
          <ChevronRightIcon
            className={cn(
              "size-3 shrink-0 transition-transform",
              isOpen && "rotate-90",
              !hasChildren && "opacity-30",
            )}
            aria-hidden
          />
          {isOpen ? (
            <FolderOpenIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span className="truncate">{node.name}</span>
          {childCount > 0 ? (
            <span className="ml-auto text-xs text-muted-foreground">{childCount}</span>
          ) : null}
        </button>
      </div>
      {isOpen && hasChildren ? (
        <ul role="group" className="space-y-0.5">
          {Array.from(node.children.values()).map((child) => (
            <FolderTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              openPaths={openPaths}
              onToggle={onToggle}
              selectedName={selectedName}
              selectedPath={selectedPath}
              basePath={basePath}
              enableDnd={enableDnd}
            />
          ))}
          {node.prompts.map((name) => (
            <PromptLeaf
              key={name}
              name={name}
              depth={depth + 1}
              selected={name === selectedName}
              basePath={basePath}
              enableDnd={enableDnd}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

interface PromptLeafProps {
  name: string;
  depth: number;
  selected: boolean;
  basePath: string;
  enableDnd: boolean;
}

function PromptLeaf({ name, depth, selected, basePath, enableDnd }: PromptLeafProps) {
  const leaf = name.split("/").filter((s) => s.length > 0).pop() ?? name;
  const draggable = useDraggable({ id: name, disabled: !enableDnd });
  const style = draggable.transform
    ? {
        transform: `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`,
        opacity: 0.85,
        paddingLeft: `${(depth + 1) * 12 + 6}px`,
      }
    : { paddingLeft: `${(depth + 1) * 12 + 6}px` };

  // When DnD is on we need a wrapping div for the draggable refs so the
  // Link still works as a navigation control on plain click. The pointer
  // sensor's 6px activation distance lets normal clicks through.
  if (enableDnd) {
    return (
      <li role="treeitem" aria-selected={selected}>
        <div
          ref={draggable.setNodeRef}
          {...draggable.listeners}
          {...draggable.attributes}
          style={style}
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted",
            selected && "bg-muted font-medium",
            draggable.isDragging && "z-50",
          )}
        >
          <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <Link
            href={`${basePath}/${encodeURIComponent(name)}`}
            className="min-w-0 flex-1 truncate"
            draggable={false}
            onClick={(e) => {
              // Block navigation while a drag is in flight so the user doesn't
              // get teleported when releasing over an invalid drop target.
              if (draggable.isDragging) e.preventDefault();
            }}
          >
            {leaf}
          </Link>
        </div>
      </li>
    );
  }

  return (
    <li role="treeitem" aria-selected={selected}>
      <Link
        href={`${basePath}/${encodeURIComponent(name)}`}
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted",
          selected && "bg-muted font-medium",
        )}
        style={style as React.CSSProperties}
      >
        <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{leaf}</span>
      </Link>
    </li>
  );
}

function totalDescendants(node: FolderNode): number {
  let count = node.prompts.length;
  for (const child of node.children.values()) {
    count += totalDescendants(child);
  }
  return count;
}

function ancestorsOf(root: FolderNode, name: string | undefined): Set<string> {
  const open = new Set<string>();
  if (!name) return open;
  const segments = name.split("/").filter((s) => s.length > 0);
  let path = "";
  for (let i = 0; i < segments.length - 1; i++) {
    path = path ? `${path}/${segments[i]}` : segments[i];
    open.add(path);
  }
  // Also expand root-level folders so the user can see siblings of the
  // current path without manual opening.
  for (const child of root.children.values()) {
    if (segments[0] && child.name === segments[0]) open.add(child.path);
  }
  return open;
}
