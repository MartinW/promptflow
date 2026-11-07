"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  initial?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Search box for `/skills`. Same debounced-replace pattern as the prompts
 * list's `SearchInput`, kept as a separate copy since that one hardcodes
 * the `/prompts` redirect path.
 */
export function SkillsSearchInput({
  initial = "",
  placeholder = "Search by name or description...",
  className,
}: SearchInputProps) {
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
      router.replace(qs ? `/skills?${qs}` : "/skills");
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
