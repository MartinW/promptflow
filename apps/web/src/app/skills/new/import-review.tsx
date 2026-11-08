"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { importSkillsAction, type ImportSkillResult } from "../actions";
import type { DetectedSkill } from "./parse-zip";

interface ImportReviewProps {
  skills: DetectedSkill[];
  skippedCount: number;
  onCancel: () => void;
}

/**
 * Review/select screen shown when a ZIP contains more than one `SKILL.md`.
 * Mirrors Langfuse's own "Import skills" flow (detect → review → select →
 * import) rather than the single-skill form's inline-populate behaviour,
 * since there's no single set of form fields to populate here.
 */
export function ImportReview({ skills, skippedCount, onCancel }: ImportReviewProps) {
  const importable = skills.filter((s) => s.frontmatter !== null);
  const [selected, setSelected] = useState<Set<string>>(new Set(importable.map((s) => s.root)));
  const [commitMessage, setCommitMessage] = useState("");
  const [results, setResults] = useState<Map<string, ImportSkillResult> | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(root: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(root)) next.delete(root);
      else next.add(root);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === importable.length ? new Set() : new Set(importable.map((s) => s.root))));
  }

  function handleImport() {
    const toImport = importable.filter((s) => selected.has(s.root));
    if (toImport.length === 0) return;

    startTransition(async () => {
      const outcomes = await importSkillsAction(
        toImport.map((s) => ({
          skillMd: s.skillMd,
          files: s.files,
          commitMessage: commitMessage || undefined,
        })),
      );
      const byRoot = new Map(toImport.map((s, i) => [s.root, outcomes[i]]));
      setResults(byRoot);

      const succeeded = outcomes.filter((o) => o.ok).length;
      const failed = outcomes.length - succeeded;
      if (failed === 0) {
        toast.success(`Imported ${succeeded} skill${succeeded === 1 ? "" : "s"}`);
      } else {
        toast.error(`Imported ${succeeded}, ${failed} failed`, {
          description: "See the list below for details.",
        });
      }
    });
  }

  const allSelected = selected.size === importable.length && importable.length > 0;
  const doneImporting = results !== null;

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">
              {skills.length} skill{skills.length === 1 ? "" : "s"} detected
            </h2>
            {skippedCount > 0 ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                {skippedCount} file{skippedCount === 1 ? "" : "s"} in the ZIP weren&apos;t part of any
                skill folder and were ignored.
              </p>
            ) : null}
          </div>
          {!doneImporting ? (
            <Button type="button" variant="outline" size="sm" onClick={toggleAll} disabled={pending}>
              {allSelected ? "Deselect all" : "Select all"}
            </Button>
          ) : null}
        </div>

        <ul className="divide-y divide-border rounded-md border border-border">
          {skills.map((skill) => {
            const result = results?.get(skill.root);
            const invalid = skill.frontmatter === null;
            return (
              <li key={skill.root} className="flex items-start gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(skill.root)}
                  onChange={() => toggle(skill.root)}
                  disabled={pending || doneImporting || invalid}
                  className="mt-1 size-4 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium truncate">
                      {skill.frontmatter?.name ?? (skill.root || "(root)")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {skill.files.length + 1} file{skill.files.length === 0 ? "" : "s"}
                    </span>
                    {result ? (
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          result.ok
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-red-500/15 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {result.ok ? "Imported" : "Failed"}
                      </span>
                    ) : null}
                  </div>
                  {skill.frontmatter ? (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {skill.frontmatter.description}
                    </p>
                  ) : (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                      Invalid SKILL.md frontmatter at{" "}
                      <span className="font-mono">{skill.root || "/"}SKILL.md</span> — can&apos;t import.
                    </p>
                  )}
                  {result && !result.ok ? (
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5 font-mono break-all">
                      {result.error}
                    </p>
                  ) : null}
                </div>
                {result?.ok && result.name ? (
                  <Link
                    href={`/skills/${encodeURIComponent(result.name)}`}
                    className="text-xs underline text-muted-foreground hover:text-foreground"
                  >
                    View
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>

        {!doneImporting ? (
          <div className="space-y-2">
            <span className="text-sm font-medium">Commit message</span>
            <Input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Imported from ZIP"
              disabled={pending}
            />
          </div>
        ) : null}
      </Card>

      <div className="flex justify-end gap-3">
        {doneImporting ? (
          <>
            <Button type="button" variant="outline" onClick={onCancel}>
              Import another ZIP
            </Button>
            <Link href="/skills" className="inline-flex">
              <Button type="button">Go to Skills list</Button>
            </Link>
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleImport} disabled={pending || selected.size === 0}>
              {pending ? "Importing..." : `Import ${selected.size} skill${selected.size === 1 ? "" : "s"}`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
