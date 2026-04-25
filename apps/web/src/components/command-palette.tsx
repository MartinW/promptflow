"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface PromptIndexItem {
  name: string;
  tags: string[];
  latestVersion: number;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState<PromptIndexItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Cmd+K / Ctrl+K toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lazy-load prompt index on first open
  useEffect(() => {
    if (!open || prompts.length > 0 || loading) return;
    setLoading(true);
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((json: { data: PromptIndexItem[] }) => setPrompts(json.data ?? []))
      .catch(() => {
        // swallow; palette still works for nav actions
      })
      .finally(() => setLoading(false));
  }, [open, prompts.length, loading]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const tags = collectTags(prompts);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="PromptFlow"
      description="Jump to a prompt or run an action"
    >
      <CommandInput placeholder="Search prompts, tags, actions..." />
      <CommandList>
        <CommandEmpty>{loading ? "Loading..." : "No matches."}</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/prompts")}>All prompts</CommandItem>
          <CommandItem onSelect={() => go("/prompts/new")}>New prompt…</CommandItem>
        </CommandGroup>

        {prompts.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Prompts">
              {prompts.map((p) => (
                <CommandItem
                  key={p.name}
                  value={`${p.name} ${p.tags.join(" ")}`}
                  onSelect={() => go(`/prompts/${encodeURIComponent(p.name)}`)}
                >
                  <span className="font-mono">{p.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">v{p.latestVersion}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {tags.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tags">
              {tags.map((t) => (
                <CommandItem
                  key={t}
                  value={`tag ${t}`}
                  onSelect={() => go(`/prompts?tag=${encodeURIComponent(t)}`)}
                >
                  <span className="font-mono">{t}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

function collectTags(prompts: PromptIndexItem[]): string[] {
  const set = new Set<string>();
  for (const p of prompts) for (const t of p.tags) set.add(t);
  return [...set].sort();
}
