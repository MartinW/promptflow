"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";
import { FontFamilyProvider } from "@/components/font-family";
import { PreferredModelsProvider } from "@/components/preferred-models";
import { StyleVariantProvider } from "@/components/style-variant";
import { ThemeFamilyProvider } from "@/components/theme-family";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeFamilyProvider>
        <StyleVariantProvider>
          <FontFamilyProvider>
            <PreferredModelsProvider>{children}</PreferredModelsProvider>
          </FontFamilyProvider>
        </StyleVariantProvider>
      </ThemeFamilyProvider>
    </NextThemesProvider>
  );
}
