"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";
import { FontFamilyProvider } from "@/components/font-family";
import { ThemeFamilyProvider } from "@/components/theme-family";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeFamilyProvider>
        <FontFamilyProvider>{children}</FontFamilyProvider>
      </ThemeFamilyProvider>
    </NextThemesProvider>
  );
}
