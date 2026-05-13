import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Lora, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { AppHeader } from "@/components/app-header";
import { CommandPalette } from "@/components/command-palette";
import { fontFamilyInitScript } from "@/components/font-family";
import { styleVariantInitScript } from "@/components/style-variant";
import { themeFamilyInitScript } from "@/components/theme-family";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PromptFlow",
  description: "A better UI for Langfuse prompt management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${lora.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* `next/script` with `beforeInteractive` is the Next.js-blessed way
            to inject pre-hydration init scripts. Unlike a literal `<script>`
            JSX element, Next.js handles the render path so React 19's
            "script inside React component" warning doesn't fire. These three
            set CSS classes on <html> before paint to avoid theme/font FOUC. */}
        <Script id="pf-style-variant" strategy="beforeInteractive">
          {styleVariantInitScript}
        </Script>
        <Script id="pf-theme-family" strategy="beforeInteractive">
          {themeFamilyInitScript}
        </Script>
        <Script id="pf-font-family" strategy="beforeInteractive">
          {fontFamilyInitScript}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <AppHeader />
          <div className="flex-1">{children}</div>
          <CommandPalette />
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
