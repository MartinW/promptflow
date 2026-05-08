"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const THEME_FAMILIES = ["default", "midnight", "forest", "sunset", "lovely", "quietly"] as const;
export type ThemeFamily = (typeof THEME_FAMILIES)[number];

const STORAGE_KEY = "theme-family";
const FAMILY_CLASSES = THEME_FAMILIES.map((f) => `theme-${f}`);

type ThemeFamilyContextValue = {
  family: ThemeFamily;
  setFamily: (family: ThemeFamily) => void;
};

const ThemeFamilyContext = createContext<ThemeFamilyContextValue | null>(null);

function applyFamilyClass(family: ThemeFamily) {
  const root = document.documentElement;
  for (const cls of FAMILY_CLASSES) root.classList.remove(cls);
  root.classList.add(`theme-${family}`);
}

export function ThemeFamilyProvider({ children }: { children: React.ReactNode }) {
  const [family, setFamilyState] = useState<ThemeFamily>("default");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeFamily | null;
    if (stored && THEME_FAMILIES.includes(stored)) {
      setFamilyState(stored);
      applyFamilyClass(stored);
    } else {
      applyFamilyClass("default");
    }
  }, []);

  const setFamily = useCallback((next: ThemeFamily) => {
    setFamilyState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyFamilyClass(next);
  }, []);

  return <ThemeFamilyContext.Provider value={{ family, setFamily }}>{children}</ThemeFamilyContext.Provider>;
}

export function useThemeFamily() {
  const ctx = useContext(ThemeFamilyContext);
  if (!ctx) throw new Error("useThemeFamily must be used within ThemeFamilyProvider");
  return ctx;
}

// Inline script run before hydration so the family class is on <html> before paint.
// Kept as a string (no closures) so it can be rendered via dangerouslySetInnerHTML.
export const themeFamilyInitScript = `
(function(){try{
  var f=localStorage.getItem('${STORAGE_KEY}');
  var allowed=${JSON.stringify(THEME_FAMILIES)};
  if(allowed.indexOf(f)===-1)f='default';
  document.documentElement.classList.add('theme-'+f);
}catch(e){document.documentElement.classList.add('theme-default');}})();
`;
