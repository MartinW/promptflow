"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  /** Initial value from the server-rendered URL. */
  initial?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Search box for `/prompts` that updates only the `?q=` query param via
 * router.replace, preserving every other param (view, tag, mode, folder).
 * Debounced 200ms so typing doesn't flood the server with renders.
 *
 * Replaces a plain `<form>` submission that previously bulldozed the
 * existing query string — switching from canvas to list whenever the user
 * pressed Enter.
 */
export function SearchInput({ initial = "", placeholder = "Search by name...", className }: SearchInputProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function commit(next: string): void {
    const merged = new URLSearchParams(params.toString());
    if (next.trim()) merged.set("q", next.trim());
    else merged.delete("q");
    const qs = merged.toString();
    startTransition(() => {
      router.replace(qs ? `/prompts?${qs}` : "/prompts");
    });
  }

  return (
    <Input
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => commit(next), 200);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (debounceRef.current) clearTimeout(debounceRef.current);
          commit(value);
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}
