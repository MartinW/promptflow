import type { Metadata } from "next";
import { StylePreview } from "@/components/style-preview";
import { ThemePicker } from "@/components/theme-picker";

export const metadata: Metadata = {
  title: "Settings · PromptFlow",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Customize how PromptFlow looks and feels.</p>
      </header>

      <section aria-labelledby="theme-heading" className="space-y-6">
        <div>
          <h2 id="theme-heading" className="text-base font-medium">
            Theme
          </h2>
          <p className="text-sm text-muted-foreground">Choose how the interface should appear.</p>
        </div>
        <ThemePicker />
        <StylePreview />
      </section>
    </main>
  );
}
