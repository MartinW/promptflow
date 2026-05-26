"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ModelGroup } from "@/lib/openrouter";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "preferred-models";

type PreferredModelsContextValue = {
  preferredIds: Set<string>;
  toggleModel: (id: string) => void;
  setPreferred: (ids: Set<string>) => void;
  clearAll: () => void;
  hasPreferences: boolean;
};

const PreferredModelsContext = createContext<PreferredModelsContextValue | null>(null);

function persist(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function PreferredModelsProvider({ children }: { children: React.ReactNode }) {
  const [preferredIds, setPreferredIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) setPreferredIds(new Set(parsed as string[]));
      }
    } catch {}
    setMounted(true);
  }, []);

  const toggleModel = useCallback((id: string) => {
    setPreferredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
      return next;
    });
  }, []);

  const setPreferred = useCallback((next: Set<string>) => {
    setPreferredIds(next);
    persist(next);
  }, []);

  const clearAll = useCallback(() => {
    const next = new Set<string>();
    setPreferredIds(next);
    persist(next);
  }, []);

  return (
    <PreferredModelsContext.Provider
      value={{
        preferredIds: mounted ? preferredIds : new Set<string>(),
        toggleModel,
        setPreferred,
        clearAll,
        hasPreferences: mounted && preferredIds.size > 0,
      }}
    >
      {children}
    </PreferredModelsContext.Provider>
  );
}

export function usePreferredModels() {
  const ctx = useContext(PreferredModelsContext);
  if (!ctx) throw new Error("usePreferredModels must be used within PreferredModelsProvider");
  return ctx;
}

export function filterModelGroups(groups: ModelGroup[], preferredIds: Set<string>): ModelGroup[] {
  if (preferredIds.size === 0) return groups;
  return groups
    .map((g) => ({ ...g, models: g.models.filter((m) => preferredIds.has(m.id)) }))
    .filter((g) => g.models.length > 0);
}

export function ModelPreferencesPicker({ allGroups }: { allGroups: ModelGroup[] }) {
  const { preferredIds, toggleModel, setPreferred, clearAll, hasPreferences } = usePreferredModels();
  const [search, setSearch] = useState("");
  const [activeProviders, setActiveProviders] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const allModels = allGroups.flatMap((g) => g.models);
  const providers = allGroups.map((g) => g.provider);
  const totalCount = allModels.length;

  const q = search.toLowerCase().trim();
  const visibleModels = allModels.filter((m) => {
    const matchesSearch = !q || m.shortName.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
    const matchesProvider = activeProviders.size === 0 || activeProviders.has(m.provider);
    return matchesSearch && matchesProvider;
  });

  const allVisibleSelected = visibleModels.length > 0 && visibleModels.every((m) => preferredIds.has(m.id));
  const someVisibleSelected = visibleModels.some((m) => preferredIds.has(m.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [someVisibleSelected, allVisibleSelected]);

  function toggleAllVisible() {
    const next = new Set(preferredIds);
    if (allVisibleSelected) {
      for (const m of visibleModels) next.delete(m.id);
    } else {
      for (const m of visibleModels) next.add(m.id);
    }
    setPreferred(next);
  }

  function toggleProvider(provider: string) {
    setActiveProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  }

  if (!mounted) return null;

  return (
    <div className="space-y-3">
      {/* Search + clear */}
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Search models…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {hasPreferences && (
          <button
            type="button"
            onClick={clearAll}
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Clear shortlist
          </button>
        )}
      </div>

      {/* Provider filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveProviders(new Set())}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
            activeProviders.size === 0
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {providers.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => toggleProvider(p)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
              activeProviders.has(p)
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Status line */}
      <p className="text-xs text-muted-foreground">
        {hasPreferences ? (
          <>{preferredIds.size} of {totalCount} in shortlist · </>
        ) : (
          <>All {totalCount} models shown in Playground · </>
        )}
        {visibleModels.length < totalCount && `${visibleModels.length} rows visible`}
      </p>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b">
                <th className="w-10 px-3 py-2.5 text-left">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Select all visible models"
                    className="size-4 accent-foreground cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Model
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                  Provider
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                  Context
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">
                  Price / M tokens
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleModels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No models match your filters.
                  </td>
                </tr>
              ) : (
                visibleModels.map((m) => {
                  const checked = preferredIds.has(m.id);
                  return (
                    <tr
                      key={m.id}
                      onClick={() => toggleModel(m.id)}
                      className={cn(
                        "border-b last:border-b-0 cursor-pointer select-none transition-colors",
                        "hover:bg-muted/40",
                        checked && "bg-card",
                      )}
                    >
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleModel(m.id)}
                          className="size-4 accent-foreground cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs leading-snug">{m.shortName}</td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{m.provider}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs">
                        {m.contextLabel}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs hidden sm:table-cell">
                        {m.priceLabel}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
