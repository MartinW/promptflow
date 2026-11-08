"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface SkillMdViewerProps {
  /** SKILL.md body with the frontmatter block already stripped. */
  body: string;
}

/**
 * Renders a skill's `SKILL.md` body as markdown by default, with a toggle
 * to drop into the raw source — mirrors how the prompt detail page shows a
 * rendered view but lets you get at the underlying text.
 */
export function SkillMdViewer({ body }: SkillMdViewerProps) {
  const [mode, setMode] = useState<"preview" | "raw">("preview");

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">SKILL.md</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("preview")}
          >
            Preview
          </Button>
          <Button
            type="button"
            variant={mode === "raw" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("raw")}
          >
            Raw
          </Button>
        </div>
      </div>
      {mode === "preview" ? (
        <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      ) : (
        <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words leading-6 max-h-96 overflow-y-auto">
          {body}
        </pre>
      )}
    </Card>
  );
}
