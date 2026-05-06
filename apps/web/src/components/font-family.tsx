"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const FONT_FAMILIES = ["default", "inter", "lora", "jetbrains"] as const;
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

export function FontFamilyProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = useState<FontFamily>("default");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as FontFamily | null;
    if (stored && FONT_FAMILIES.includes(stored)) {
      setFontState(stored);
      applyFontClass(stored);
    } else {
      applyFontClass("default");
    }
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
  var allowed=${JSON.stringify(FONT_FAMILIES)};
  if(allowed.indexOf(f)===-1)f='default';
  document.documentElement.classList.add('pf-typeface-'+f);
}catch(e){document.documentElement.classList.add('pf-typeface-default');}})();
`;
