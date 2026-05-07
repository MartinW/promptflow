"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const FONT_FAMILIES = ["auto", "default", "space-grotesk", "lora", "jetbrains"] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number];

const STORAGE_KEY = "font-family";
const FONT_CLASSES = FONT_FAMILIES.map((f) => `pf-typeface-${f}`);

type FontFamilyContextValue = {
  font: FontFamily;
  setFont: (font: FontFamily) => void;
};

const FontFamilyContext = createContext<FontFamilyContextValue | null>(null);

function applyFontClass(font: FontFamily) {
  const root = document.documentElement;
  for (const cls of FONT_CLASSES) root.classList.remove(cls);
  root.classList.add(`pf-typeface-${font}`);
}

function normalize(stored: string | null): FontFamily {
  if (stored === "inter") return "auto";
  if (stored && (FONT_FAMILIES as readonly string[]).includes(stored)) return stored as FontFamily;
  return "auto";
}

export function FontFamilyProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = useState<FontFamily>("auto");

  useEffect(() => {
    const next = normalize(localStorage.getItem(STORAGE_KEY));
    setFontState(next);
    applyFontClass(next);
    if (localStorage.getItem(STORAGE_KEY) === "inter") localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const setFont = useCallback((next: FontFamily) => {
    setFontState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyFontClass(next);
  }, []);

  return <FontFamilyContext.Provider value={{ font, setFont }}>{children}</FontFamilyContext.Provider>;
}

export function useFontFamily() {
  const ctx = useContext(FontFamilyContext);
  if (!ctx) throw new Error("useFontFamily must be used within FontFamilyProvider");
  return ctx;
}

export const fontFamilyInitScript = `
(function(){try{
  var f=localStorage.getItem('${STORAGE_KEY}');
  if(f==='inter')f='auto';
  var allowed=${JSON.stringify(FONT_FAMILIES)};
  if(allowed.indexOf(f)===-1)f='auto';
  document.documentElement.classList.add('pf-typeface-'+f);
}catch(e){document.documentElement.classList.add('pf-typeface-auto');}})();
`;
