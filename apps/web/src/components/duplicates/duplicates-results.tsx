"use client";

import type { DuplicateGroup } from "@promptflow/core";
import { ScissorsIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DuplicateExtractDialog } from "./duplicate-extract-dialog";

interface DuplicatesResultsProps {
  groups: DuplicateGroup[];
}

/**
 * Lists duplicate-paragraph groups detected across the corpus. Each row shows
 * the snippet, the prompts that share it, and a CTA that opens the extraction
 * dialog pre-filled with the group's targets.
 */
export function DuplicatesResults({ groups }: DuplicatesResultsProps) {
  const [activeGroup, setActiveGroup] = useState<DuplicateGroup | null>(null);

  if (groups.length === 0) {
    return (
      <Card className="p-10 text-center space-y-2">
        <h2 className="font-medium">No duplicates found</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The scanner couldn't find any paragraph (≥ 40 chars) that appears in two or more prompts.
          Try seeding the corpus first or relax the duplication threshold.
        </p>
      </Card>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {groups.map((group) => (
          <li key={group.text}>
            <Card className="p-4 space-y-3">
              <pre className="max-h-32 overflow-auto rounded bg-muted px-2 py-1.5 font-mono text-xs whitespace-pre-wrap">
                {group.text}
              </pre>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">
                  {group.occurrences.length} prompts · {group.totalOccurrences} occurrences ·{" "}
                  {group.text.length} chars
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveGroup(group)}
                >
                  <ScissorsIcon className="size-3" /> Extract & apply
                </Button>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {group.occurrences.map((occ) => (
                  <li
                    key={occ.promptName}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                    title={`${occ.count} ${occ.count === 1 ? "match" : "matches"}`}
                  >
                    {occ.promptName}
                    {occ.count > 1 ? <span className="ml-1 opacity-60">×{occ.count}</span> : null}
                  </li>
                ))}
              </ul>
            </Card>
          </li>
        ))}
      </ul>
      {activeGroup ? (
        <DuplicateExtractDialog
          open={Boolean(activeGroup)}
          onOpenChange={(o) => {
            if (!o) setActiveGroup(null);
          }}
          group={activeGroup}
        />
      ) : null}
    </>
  );
}
