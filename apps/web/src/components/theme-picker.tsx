"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { type FontFamily, useFontFamily } from "@/components/font-family";
import { type ThemeFamily, useThemeFamily } from "@/components/theme-family";
import { cn } from "@/lib/utils";

type FamilyOption = {
  value: ThemeFamily;
  label: string;
  description: string;
  swatch: { bg: string; primary: string; accent: string };
};

const FAMILIES: FamilyOption[] = [
  {
    value: "default",
    label: "Default",
    description: "Neutral greyscale.",
    swatch: { bg: "oklch(1 0 0)", primary: "oklch(0.205 0 0)", accent: "oklch(0.708 0 0)" },
  },
  {
    value: "midnight",
    label: "Midnight",
    description: "Deep blue tones.",
    swatch: { bg: "oklch(0.2 0.07 270)", primary: "oklch(0.72 0.18 270)", accent: "oklch(0.45 0.2 270)" },
  },
  {
    value: "forest",
    label: "Forest",
    description: "Calm greens.",
    swatch: { bg: "oklch(0.2 0.06 150)", primary: "oklch(0.72 0.18 145)", accent: "oklch(0.45 0.16 145)" },
  },
  {
    value: "sunset",
    label: "Sunset",
    description: "Warm oranges.",
    swatch: { bg: "oklch(0.22 0.07 35)", primary: "oklch(0.72 0.18 45)", accent: "oklch(0.58 0.2 40)" },
  },
];

const MODES = [
  { value: "light", label: "Light", icon: Sun, description: "Bright and clean." },
  { value: "dark", label: "Dark", icon: Moon, description: "Easy on the eyes." },
  { value: "system", label: "System", icon: Monitor, description: "Match your OS." },
] as const;

type FontOption = {
  value: FontFamily;
  label: string;
  description: string;
  className: string;
};

const FONTS: FontOption[] = [
  { value: "default", label: "Geist", description: "Clean geometric sans.", className: "pf-typeface-default" },
  { value: "inter", label: "Inter", description: "Friendly humanist sans.", className: "pf-typeface-inter" },
  { value: "lora", label: "Lora", description: "Warm editorial serif.", className: "pf-typeface-lora" },
  { value: "jetbrains", label: "JetBrains Mono", description: "Crisp monospaced.", className: "pf-typeface-jetbrains" },
];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { family, setFamily } = useThemeFamily();
  const { font, setFont } = useFontFamily();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentMode = mounted ? theme : undefined;
  const currentFamily = mounted ? family : undefined;
  const currentFont = mounted ? font : undefined;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Theme family</h3>
          <p className="text-xs text-muted-foreground">Pick a color palette.</p>
        </div>
        <div role="radiogroup" aria-label="Theme family" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FAMILIES.map(({ value, label, description, swatch }) => {
            const selected = currentFamily === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setFamily(value)}
                className={cn(
                  "flex flex-col items-start gap-3 rounded-lg border bg-card p-4 text-left transition-colors",
                  "hover:border-foreground/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-foreground/60 ring-1 ring-foreground/40" : "border-border",
                )}
              >
                <div
                  aria-hidden
                  className="flex h-10 w-full items-center overflow-hidden rounded-md ring-1 ring-foreground/10"
                  style={{ background: swatch.bg }}
                >
                  <div className="ml-auto flex h-full items-center gap-1 pr-2">
                    <span className="size-3 rounded-full" style={{ background: swatch.primary }} />
                    <span className="size-3 rounded-full" style={{ background: swatch.accent }} />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Font</h3>
          <p className="text-xs text-muted-foreground">Pick a typeface for the interface.</p>
        </div>
        <div role="radiogroup" aria-label="Font family" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FONTS.map(({ value, label, description, className }) => {
            const selected = currentFont === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setFont(value)}
                className={cn(
                  "flex flex-col items-start gap-3 rounded-lg border bg-card p-4 text-left transition-colors",
                  "hover:border-foreground/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-foreground/60 ring-1 ring-foreground/40" : "border-border",
                  className,
                )}
              >
                <div className="flex h-10 w-full items-center justify-center rounded-md bg-muted/40 ring-1 ring-foreground/10">
                  <span className="text-2xl leading-none">Aa</span>
                </div>
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Mode</h3>
          <p className="text-xs text-muted-foreground">Light, dark, or follow your system.</p>
        </div>
        <div role="radiogroup" aria-label="Theme mode" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODES.map(({ value, label, icon: Icon, description }) => {
            const selected = currentMode === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-left transition-colors",
                  "hover:border-foreground/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-foreground/60 ring-1 ring-foreground/40" : "border-border",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4" aria-hidden />
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
