"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const STYLE_VARIANTS = ["clean", "brutalist", "editorial", "terminal"] as const;
export type StyleVariant = (typeof STYLE_VARIANTS)[number];

const STORAGE_KEY = "style-variant";
const STYLE_CLASSES = STYLE_VARIANTS.map((s) => `style-${s}`);

type StyleVariantContextValue = {
  style: StyleVariant;
  setStyle: (style: StyleVariant) => void;
};

const StyleVariantContext = createContext<StyleVariantContextValue | null>(null);

function applyStyleClass(style: StyleVariant) {
  const root = document.documentElement;
  for (const cls of STYLE_CLASSES) root.classList.remove(cls);
  root.classList.add(`style-${style}`);
}

export function StyleVariantProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyleState] = useState<StyleVariant>("clean");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as StyleVariant | null;
    if (stored && STYLE_VARIANTS.includes(stored)) {
      setStyleState(stored);
      applyStyleClass(stored);
    } else {
      applyStyleClass("clean");
    }
  }, []);

  const setStyle = useCallback((next: StyleVariant) => {
    setStyleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyStyleClass(next);
  }, []);

  return <StyleVariantContext.Provider value={{ style, setStyle }}>{children}</StyleVariantContext.Provider>;
}

export function useStyleVariant() {
  const ctx = useContext(StyleVariantContext);
  if (!ctx) throw new Error("useStyleVariant must be used within StyleVariantProvider");
  return ctx;
}

export const styleVariantInitScript = `
(function(){try{
  var s=localStorage.getItem('${STORAGE_KEY}');
  var allowed=${JSON.stringify(STYLE_VARIANTS)};
  if(allowed.indexOf(s)===-1)s='clean';
  document.documentElement.classList.add('style-'+s);
}catch(e){document.documentElement.classList.add('style-clean');}})();
`;
