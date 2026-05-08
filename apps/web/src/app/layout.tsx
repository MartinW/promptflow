import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Lora, Space_Grotesk } from "next/font/google";
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
        <script dangerouslySetInnerHTML={{ __html: styleVariantInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeFamilyInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: fontFamilyInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ClerkProvider>
          <ThemeProvider>
            <AppHeader />
            <div className="flex-1">{children}</div>
            <CommandPalette />
            <Toaster position="bottom-right" />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
